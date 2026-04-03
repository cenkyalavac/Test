"""
AI-powered Translation Error Prediction

Integrates with OpenAI and Google Gemini to predict potential translation errors
and classify them using MQM typology.
"""

import json
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional, Dict, Tuple

from .mqm_typology import (
    MQMError, MQMErrorType, MQMSeverity, MQMCategory, MQMClassifier
)
from ..parser.models import Segment


class AIEngine(Enum):
    """Supported AI engines for error prediction."""

    OPENAI = "openai"
    GEMINI = "gemini"


@dataclass
class AIPredictionConfig:
    """Configuration for AI prediction."""

    engine: AIEngine
    api_key: str
    model: Optional[str] = None  # If None, use default for engine

    def get_model(self) -> str:
        """Get the model to use."""
        if self.model:
            return self.model
        if self.engine == AIEngine.OPENAI:
            return "gpt-4-turbo"
        elif self.engine == AIEngine.GEMINI:
            return "gemini-1.5-pro"
        return "unknown"


@dataclass
class AIPrediction:
    """Result of AI prediction for a segment."""

    segment_id: str
    source_text: str
    target_text: str
    errors: List[MQMError]
    overall_comment: str
    confidence_score: float  # 0-1

    def errors_by_category(self) -> Dict[MQMCategory, List[MQMError]]:
        """Group errors by category."""
        grouped = {}
        for error in self.errors:
            if error.category not in grouped:
                grouped[error.category] = []
            grouped[error.category].append(error)
        return grouped

    def errors_by_severity(self) -> Dict[MQMSeverity, List[MQMError]]:
        """Group errors by severity."""
        grouped = {}
        for error in self.errors:
            if error.severity not in grouped:
                grouped[error.severity] = []
            grouped[error.severity].append(error)
        return grouped

    def summary_stats(self) -> Dict:
        """Get summary statistics."""
        severity_counts = {}
        category_counts = {}

        for error in self.errors:
            severity_counts[error.severity.value] = severity_counts.get(error.severity.value, 0) + 1
            category_counts[error.category.value] = category_counts.get(error.category.value, 0) + 1

        return {
            "total_errors": len(self.errors),
            "by_severity": severity_counts,
            "by_category": category_counts,
            "confidence": self.confidence_score,
        }


class AIPredictor(ABC):
    """Abstract base class for AI predictors."""

    def __init__(self, config: AIPredictionConfig):
        """Initialize predictor with configuration."""
        self.config = config
        self.api_key = config.api_key

    @abstractmethod
    def predict(self, segments: List[Segment]) -> List[AIPrediction]:
        """Predict errors in translation segments."""
        pass

    def _parse_ai_response(self, response: str) -> Tuple[List[MQMError], str]:
        """
        Parse AI response and extract errors and overall comment.
        Expected format:
        {
            "errors": [
                {
                    "error_type": "Mistranslation",
                    "message": "...",
                    "explanation": "...",
                    "suggestion": "..."
                }
            ],
            "overall_comment": "..."
        }
        """
        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            # Fallback: return empty errors with response as comment
            return [], response

        errors_data = data.get("errors", [])
        overall_comment = data.get("overall_comment", "")

        mqm_errors = []
        for error_data in errors_data:
            error_type = MQMClassifier.infer_error_type(error_data.get("message", ""))
            severity = MQMClassifier.infer_severity(error_data.get("message", ""))

            error = MQMError(
                error_type=error_type,
                category=MQMClassifier.error_type_to_category(error_type),
                severity=severity,
                segment_id="",  # Will be set by caller
                source_text="",
                target_text="",
                message=error_data.get("message", ""),
                explanation=error_data.get("explanation"),
                suggestion=error_data.get("suggestion"),
            )
            mqm_errors.append(error)

        return mqm_errors, overall_comment


class OpenAIPredictor(AIPredictor):
    """OpenAI-powered translation error predictor."""

    def predict(self, segments: List[Segment]) -> List[AIPrediction]:
        """
        Predict errors using OpenAI API.
        Requires openai package: pip install openai
        """
        try:
            import openai
        except ImportError:
            raise ImportError("openai package required. Install with: pip install openai")

        openai.api_key = self.api_key
        client = openai.OpenAI(api_key=self.api_key)

        predictions = []

        for segment in segments:
            prompt = self._build_prompt(segment)

            try:
                response = client.chat.completions.create(
                    model=self.config.get_model(),
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert translation quality assurance specialist. "
                            "Analyze translations for potential errors and classify them using MQM typology.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.3,
                    max_tokens=1000,
                )

                response_text = response.choices[0].message.content
                errors, overall_comment = self._parse_ai_response(response_text)

                # Update segment IDs and texts
                for error in errors:
                    error.segment_id = segment.segment_id
                    error.source_text = segment.source_text
                    error.target_text = segment.target_text or ""

                prediction = AIPrediction(
                    segment_id=segment.segment_id,
                    source_text=segment.source_text,
                    target_text=segment.target_text or "",
                    errors=errors,
                    overall_comment=overall_comment,
                    confidence_score=0.85,  # OpenAI typically high confidence
                )
                predictions.append(prediction)

            except Exception as e:
                # Return empty prediction on error
                print(f"Error predicting segment {segment.segment_id}: {e}")
                predictions.append(
                    AIPrediction(
                        segment_id=segment.segment_id,
                        source_text=segment.source_text,
                        target_text=segment.target_text or "",
                        errors=[],
                        overall_comment=f"Error during prediction: {str(e)}",
                        confidence_score=0.0,
                    )
                )

        return predictions

    def _build_prompt(self, segment: Segment) -> str:
        """Build the prompt for error prediction."""
        return f"""Analyze this translation for potential errors:

Source Text: {segment.source_text}
Target Text: {segment.target_text or "[UNTRANSLATED]"}

Please identify any potential translation errors and classify them using MQM (Multidimensional Quality Metrics) typology.
Consider these error categories:
- Terminology: Term not in glossary or incorrectly translated
- Accuracy: Mistranslation, omission, addition, untranslated content
- Fluency: Awkward phrasing, unnatural language, tone/register issues
- Conventions: Grammar, spelling, punctuation, formatting issues
- Design: Markup, formatting, length issues

Respond in JSON format:
{{
    "errors": [
        {{
            "error_type": "Error type from MQM",
            "message": "Brief error description",
            "explanation": "Why this is an error",
            "suggestion": "How to fix it"
        }}
    ],
    "overall_comment": "Overall assessment of translation quality"
}}

Only include actual errors found. If no errors, return empty errors array."""


class GeminiPredictor(AIPredictor):
    """Google Gemini-powered translation error predictor."""

    def predict(self, segments: List[Segment]) -> List[AIPrediction]:
        """
        Predict errors using Google Gemini API.
        Requires google-generativeai package: pip install google-generativeai
        """
        try:
            import google.generativeai as genai
        except ImportError:
            raise ImportError(
                "google-generativeai package required. Install with: pip install google-generativeai"
            )

        genai.configure(api_key=self.api_key)
        model = genai.GenerativeModel(self.config.get_model())

        predictions = []

        for segment in segments:
            prompt = self._build_prompt(segment)

            try:
                response = model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.3,
                        max_output_tokens=1000,
                    ),
                )

                response_text = response.text
                errors, overall_comment = self._parse_ai_response(response_text)

                # Update segment IDs and texts
                for error in errors:
                    error.segment_id = segment.segment_id
                    error.source_text = segment.source_text
                    error.target_text = segment.target_text or ""

                prediction = AIPrediction(
                    segment_id=segment.segment_id,
                    source_text=segment.source_text,
                    target_text=segment.target_text or "",
                    errors=errors,
                    overall_comment=overall_comment,
                    confidence_score=0.80,  # Gemini confidence
                )
                predictions.append(prediction)

            except Exception as e:
                print(f"Error predicting segment {segment.segment_id}: {e}")
                predictions.append(
                    AIPrediction(
                        segment_id=segment.segment_id,
                        source_text=segment.source_text,
                        target_text=segment.target_text or "",
                        errors=[],
                        overall_comment=f"Error during prediction: {str(e)}",
                        confidence_score=0.0,
                    )
                )

        return predictions

    def _build_prompt(self, segment: Segment) -> str:
        """Build the prompt for error prediction."""
        return f"""You are an expert translation quality assurance specialist. Analyze this translation for potential errors.

Source Text: {segment.source_text}
Target Text: {segment.target_text or "[UNTRANSLATED]"}

Identify potential translation errors and classify them using MQM (Multidimensional Quality Metrics) typology.

Consider these error categories:
- Terminology: Term not in glossary or incorrectly translated
- Accuracy: Mistranslation, omission, addition, untranslated content
- Fluency: Awkward phrasing, unnatural language, tone/register issues
- Conventions: Grammar, spelling, punctuation, formatting issues
- Design: Markup, formatting, length issues

Respond in JSON format:
{{
    "errors": [
        {{
            "error_type": "Error type from MQM",
            "message": "Brief error description",
            "explanation": "Why this is an error",
            "suggestion": "How to fix it"
        }}
    ],
    "overall_comment": "Overall assessment of translation quality"
}}

Only include actual errors found. If no errors, return empty errors array."""


class PredictorFactory:
    """Factory for creating AI predictors."""

    @staticmethod
    def create_predictor(config: AIPredictionConfig) -> AIPredictor:
        """Create an AI predictor based on configuration."""
        if config.engine == AIEngine.OPENAI:
            return OpenAIPredictor(config)
        elif config.engine == AIEngine.GEMINI:
            return GeminiPredictor(config)
        else:
            raise ValueError(f"Unsupported AI engine: {config.engine}")


class MockAIPredictor(AIPredictor):
    """Mock AI predictor for testing without API keys."""

    def predict(self, segments: List[Segment]) -> List[AIPrediction]:
        """Return mock predictions."""
        predictions = []

        for segment in segments:
            errors = []

            # Create some mock errors based on segment content
            if not segment.target_text or segment.target_text.strip() == "":
                errors.append(
                    MQMError(
                        error_type=MQMErrorType.UNTRANSLATED,
                        category=MQMCategory.ACCURACY,
                        severity=MQMSeverity.CRITICAL,
                        segment_id=segment.segment_id,
                        source_text=segment.source_text,
                        target_text=segment.target_text or "",
                        message="Segment is not translated",
                        explanation="Target text is empty or missing",
                        suggestion="Provide a translation for this segment",
                    )
                )

            # Check for potential style issues
            if len(segment.target_text or "") > len(segment.source_text) * 1.5:
                errors.append(
                    MQMError(
                        error_type=MQMErrorType.AWKWARDNESS,
                        category=MQMCategory.FLUENCY,
                        severity=MQMSeverity.MINOR,
                        segment_id=segment.segment_id,
                        source_text=segment.source_text,
                        target_text=segment.target_text or "",
                        message="Translation is significantly longer than source",
                        explanation="Over-translation may make the text awkward",
                        suggestion="Consider more concise phrasing",
                    )
                )

            overall_comment = "Mock prediction - replace with real AI model for actual analysis"

            prediction = AIPrediction(
                segment_id=segment.segment_id,
                source_text=segment.source_text,
                target_text=segment.target_text or "",
                errors=errors,
                overall_comment=overall_comment,
                confidence_score=0.5,
            )
            predictions.append(prediction)

        return predictions
