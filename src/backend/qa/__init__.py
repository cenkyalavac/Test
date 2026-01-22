"""
Quality Assurance module for Translation QA Tool.

Provides automated QA checks for translation segments and advanced
quality assurance with checklist support.
"""

from .qa_checker import QAChecker, QAIssue, IssueSeverity, IssueType
from .checklist_model import (
    Checklist, CheckRule, CheckTerm, CheckType, SearchMode
)
from .checklist_parser import ChecklistParser
from .advanced_qa_checker import (
    AdvancedQAChecker, AdvancedQAIssue, QACheckType
)
from .mqm_typology import (
    MQMError, MQMErrorType, MQMSeverity, MQMCategory, MQMClassifier
)
from .ai_predictor import (
    AIPredictionConfig, AIEngine, AIPrediction, AIPredictor,
    OpenAIPredictor, GeminiPredictor, PredictorFactory, MockAIPredictor
)

try:
    from .spell_checker import (
        MultiLanguageSpellChecker, SupportedLanguage, SpellingError,
        SPELLCHECKER_AVAILABLE, check_spelling, get_spell_checker
    )
except ImportError:
    MultiLanguageSpellChecker = None
    SupportedLanguage = None
    SpellingError = None
    SPELLCHECKER_AVAILABLE = False
    check_spelling = None
    get_spell_checker = None

__all__ = [
    # Basic QA
    "QAChecker",
    "QAIssue",
    "IssueSeverity",
    "IssueType",
    # Advanced QA
    "AdvancedQAChecker",
    "AdvancedQAIssue",
    "QACheckType",
    # Checklists
    "Checklist",
    "CheckRule",
    "CheckTerm",
    "CheckType",
    "SearchMode",
    "ChecklistParser",
    # MQM Typology
    "MQMError",
    "MQMErrorType",
    "MQMSeverity",
    "MQMCategory",
    "MQMClassifier",
    # AI Prediction
    "AIPredictionConfig",
    "AIEngine",
    "AIPrediction",
    "AIPredictor",
    "OpenAIPredictor",
    "GeminiPredictor",
    "PredictorFactory",
    "MockAIPredictor",
    # Spell Checking
    "MultiLanguageSpellChecker",
    "SupportedLanguage",
    "SpellingError",
    "SPELLCHECKER_AVAILABLE",
    "check_spelling",
    "get_spell_checker",
]
