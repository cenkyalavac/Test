# AI-Powered Translation Error Prediction Feature

## Overview

The Translation QA Tool now includes an advanced AI-powered error prediction system that uses OpenAI's GPT-4 or Google Gemini to analyze translations and classify errors using industry-standard MQM (Multidimensional Quality Metrics) typology.

## Key Features

### 1. Multi-Engine AI Support

The system supports three AI engines:

- **OpenAI (GPT-4)**: Most powerful for complex error detection
- **Google Gemini**: Fast and accurate predictions with good quality
- **Mock Engine**: For testing without API keys (demo purposes)

### 2. MQM Typology Classification

Errors are automatically classified into six major categories with 16+ specific error types:

#### Categories

| Category | Description | Error Types |
|----------|-------------|------------|
| **Terminology** | Term-related issues | Terminology mismatches |
| **Accuracy** | Content accuracy issues | Mistranslation, Omission, Addition, Untranslated, Over/Under-translation |
| **Fluency** | Language naturalness | Awkwardness, Unintelligibility, Style, Tone, Register, Consistency |
| **Conventions** | Language/format rules | Grammar, Orthography, Punctuation, Typography, Locale, Capitalization |
| **Design** | Markup/format issues | Markup, Formatting, Length |
| **Other** | Miscellaneous | Other issues |

### 3. Severity Levels

Each error is assigned a severity level:

- **🔴 Critical**: Message cannot be understood (functionality broken)
- **🟠 Major**: Message understood but functionality impaired
- **🟡 Minor**: Message understood but may cause user irritation
- **🔵 Neutral**: No impact on quality

### 4. Comprehensive Error Analysis

For each detected error, the system provides:

- **Error Type**: Specific classification (e.g., "Mistranslation")
- **Category**: MQM category
- **Severity**: Impact level
- **Message**: Brief description of the issue
- **Explanation**: Why this is a problem
- **Suggestion**: How to fix it

### 5. Overall Assessment

Each segment receives an overall comment providing context about translation quality.

### 6. Confidence Scoring

Predictions include confidence scores (0-100%) indicating the AI engine's confidence in the analysis.

## Architecture

### Backend Components

#### 1. **mqm_typology.py** (150+ lines)

Defines the MQM classification system:

```python
class MQMErrorType(Enum)
class MQMSeverity(Enum)
class MQMCategory(Enum)
class MQMError(dataclass)
class MQMClassifier
```

Features:
- Error type to category mapping
- Automatic severity inference from error messages
- Comprehensive error keywords database

#### 2. **ai_predictor.py** (400+ lines)

Implements AI prediction engines:

```python
class AIPredictor(ABC)          # Abstract base class
class OpenAIPredictor          # GPT-4 integration
class GeminiPredictor          # Gemini integration
class MockAIPredictor          # Testing/demo
class PredictorFactory         # Factory pattern for engine selection
```

Key methods:
- `predict(segments)`: Main prediction entry point
- `_parse_ai_response()`: Parse JSON response from AI
- `_build_prompt()`: Construct expert prompts

#### 3. **api.py** (500+ lines)

Flask REST API with endpoints:

```python
POST /api/config/ai-keys              # Set API keys
POST /api/config/default-engine       # Select default engine
GET  /api/config/engines              # List configured engines
POST /api/files/parse                 # Parse translation files
POST /api/ai/predict                  # Run predictions
POST /api/ai/predict-batch            # Batch with QA integration
POST /api/qa/check                    # Run QA checks
POST /api/checklists/parse            # Parse XBench checklists
```

### Frontend Components

#### 1. **AISettings.tsx** (150+ lines)

Settings panel for API key configuration:

- OpenAI API key input (secure)
- Google Gemini API key input (secure)
- Engine status display
- Default engine selection
- Links to API documentation

Features:
- Password-style input with toggle visibility
- Configuration persistence
- Status indicators (✓ configured, key preview)

#### 2. **AIPredictionResults.tsx** (300+ lines)

Results display component:

- Summary statistics (total segments, errors, confidence)
- Error distribution by severity and category
- Individual segment cards with expandable details
- Inline error display with:
  - Error type and category badges
  - Severity indicators (colored)
  - Explanation and suggestions
  - Statistics breakdown

#### 3. **AIAnalysisPanel.tsx** (200+ lines)

Main analysis interface:

- Tabbed interface (Settings/Results)
- Run Analysis button with loading state
- Export results to JSON
- Feature information display
- Integration with FileUpload

## API Usage Examples

### Configure OpenAI API Key

```bash
curl -X POST http://localhost:5000/api/config/ai-keys \
  -H "Content-Type: application/json" \
  -d '{
    "engine": "openai",
    "api_key": "sk-..."
  }'
```

### Run AI Prediction

```bash
curl -X POST http://localhost:5000/api/ai/predict \
  -H "Content-Type: application/json" \
  -d '{
    "segments": [
      {
        "segment_id": "1",
        "source_text": "Click Save",
        "target_text": "Tıkla Kaydet",
        "status": "translated",
        "source_language": "en",
        "target_language": "tr"
      }
    ],
    "engine": "openai"
  }'
```

### Response Format

```json
{
  "engine": "openai",
  "predictions": [
    {
      "segment_id": "1",
      "source_text": "Click Save",
      "target_text": "Tıkla Kaydet",
      "errors": [
        {
          "error_type": "Mistranslation",
          "category": "Accuracy",
          "severity": "major",
          "message": "'Click' terminology issue",
          "explanation": "Should use action verb form",
          "suggestion": "Consider 'Tıkla' for consistency"
        }
      ],
      "overall_comment": "Translation is acceptable...",
      "confidence": 0.85,
      "stats": {
        "total_errors": 1,
        "by_severity": {"major": 1},
        "by_category": {"Accuracy": 1}
      }
    }
  ],
  "total_predictions": 1
}
```

## Workflow

### User Workflow

1. **Upload File**
   - User uploads XLIFF, PO, or JSON translation file
   - System parses and extracts segments

2. **Configure AI (First Time)**
   - Click "AI Settings"
   - Paste OpenAI or Gemini API key
   - Select default engine

3. **Run Analysis**
   - Click "AI Analiz Başlat" button
   - Segments sent to configured AI engine
   - System waits for predictions

4. **Review Results**
   - Results grouped by segment
   - Errors categorized by type and severity
   - Overall assessment provided
   - Suggestions for fixes

5. **Export Results**
   - Click "Export JSON"
   - Download detailed prediction report

## Configuration

### Environment Variables (Optional)

```bash
OPENAI_API_KEY=sk-...          # OpenAI API key
GEMINI_API_KEY=AIza...         # Google Gemini API key
FLASK_ENV=development          # Flask environment
```

### Requirements

Backend dependencies:
```
flask>=2.0
flask-cors>=3.0
openai>=1.0 (optional)
google-generativeai>=0.1 (optional)
```

Frontend dependencies:
```
lucide-react                    # Icons
tailwindcss                     # Styling
```

## Testing

Run the comprehensive test suite:

```bash
python -m src.backend.qa.test_ai_predictor
```

This executes 4 demo functions:
1. **MQM Classification**: Shows error categorization
2. **Type/Severity Inference**: Demonstrates automatic inference
3. **Mock Predictor**: Tests without API keys
4. **Error Grouping**: Shows statistics and filtering

## Performance

### Inference Time

- **OpenAI GPT-4**: ~2-3 seconds per segment
- **Google Gemini**: ~1-2 seconds per segment
- **Mock (Local)**: ~100ms per segment

### Cost Estimation

Using OpenAI GPT-4 API (as of 2024):
- Approximately $0.01-0.02 per segment for analysis
- Batch predictions with 100 segments: ~$1-2

### Recommended Usage

- Use **Mock engine** for local testing
- Use **Gemini** for fast, cost-effective production
- Use **GPT-4** for complex, high-stakes translations

## Security Considerations

1. **API Keys**:
   - Stored securely on backend
   - Never logged or exposed
   - Use environment variables in production

2. **Data Privacy**:
   - Segments sent to AI provider APIs
   - Consider compliance requirements (GDPR, etc.)
   - Review provider privacy policies

3. **Rate Limiting**:
   - Implement rate limits for API calls
   - Monitor API usage and costs

## Error Handling

The system handles various error conditions:

- **API Key Missing**: Clear error message in settings
- **API Rate Limit**: Graceful fallback with retry
- **Network Error**: Detailed error messages
- **Invalid Segments**: Validation before sending to AI
- **Malformed Response**: Fallback to safe defaults

## Future Enhancements

1. **Caching**: Cache predictions for identical segments
2. **Batch Optimization**: Group segments for more efficient API calls
3. **Custom Models**: Support for fine-tuned or custom AI models
4. **Real-time Feedback**: Stream predictions as they arrive
5. **Integration with CAT Tools**: Native plugins for Trados, memoQ
6. **Terminology Database**: Link AI suggestions to terminology bases
7. **Workflow Integration**: Automatic suggestion application
8. **Analytics**: Track prediction accuracy over time

## Troubleshooting

### "API Key Not Configured"
- Go to Settings
- Enter API key for desired engine
- Click Save

### Predictions Not Appearing
- Check browser console for errors
- Verify Flask backend is running (`python -m src.backend.api`)
- Check API key is valid

### High Latency
- Use Gemini instead of GPT-4 for speed
- Consider batch predictions
- Check network connection

### High Costs
- Use Mock engine for development
- Implement caching
- Consider batch API pricing

## Documentation

- **MQM Typology**: See `src/backend/qa/mqm_typology.py`
- **AI Integration**: See `src/backend/qa/ai_predictor.py`
- **API Reference**: See `src/backend/api.py`
- **Component Docs**: See component JSDoc comments

## License

Same as Translation QA Tool project.

## Support

For issues or questions:
1. Check error messages and logs
2. Review troubleshooting section
3. Check AI provider documentation
4. Submit issue with full error context
