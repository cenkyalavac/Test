# Sample Translation Files

This directory contains sample translation files in various formats for testing the Translation QA Tool.

## Available Sample Files

### 1. **sample.sdlxliff** (SDL Trados Format)
- **Format**: SDL Trados XLIFF (SDLXLIFF)
- **Source Language**: English (en-US)
- **Target Language**: Turkish (tr-TR)
- **Segments**: 10
- **Features**:
  - SDL-specific `percent-match` attribute
  - Various match percentages (0%, 50%, 75%, 85%, 90%, 100%)
  - Mix of translated and untranslated segments
  - Real-world translation examples

**Use Case**: Test SDL Trados XLIFF format parsing and match percentage extraction

### 2. **sample.mqxliff** (MemoQ Format)
- **Format**: MemoQ XLIFF (MQXLIFF)
- **Source Language**: English
- **Target Language**: French (fr)
- **Segments**: 6
- **Features**:
  - MemoQ namespace (`mq:percent-match`)
  - Different match percentages (50%, 75%, 88%, 95%, 100%)
  - Technical terminology
  - French translations

**Use Case**: Test MemoQ XLIFF format and namespace-based match percentage attributes

### 3. **sample.xliff** (Standard OASIS XLIFF 1.2)
- **Format**: Standard OASIS XLIFF 1.2
- **Source Language**: English
- **Target Language**: German (de)
- **Segments**: 8
- **Features**:
  - Standard XLIFF 1.2 format
  - Standard `match-quality` attribute with percentage
  - Complete translations
  - German localization examples

**Use Case**: Test standard XLIFF parsing and match quality attributes

### 4. **sample.json** (JSON Translation Format)
- **Format**: JSON Translation
- **Source Language**: English
- **Target Language**: Spanish (es)
- **Segments**: 8
- **Features**:
  - JSON structure with metadata
  - `match_percentage` field
  - Flat segment structure
  - Spanish translations
  - Mix of 0-100% match percentages

**Use Case**: Test JSON format parsing and alternative structure handling

## Testing Workflow

1. **Upload a File**: Click on the file upload area and select any sample file
2. **View Results**: The dashboard will show:
   - Total number of segments
   - Match percentage distribution
   - Translation status overview
   - Quality metrics

3. **Run QA Checks**: Click "Quality Dashboard" to:
   - View detailed segment information
   - Filter by match percentage
   - Analyze translation quality
   - Export results as JSON/CSV

4. **AI Analysis** (Optional): Click "AI Analysis" to:
   - Get AI-powered error predictions
   - Identify quality issues
   - Get improvement suggestions

## Match Percentage Interpretation

| Match % | Meaning | Color |
|---------|---------|-------|
| 100% | Perfect/Previous translation match | 🔵 Blue |
| 75-99% | Fuzzy match (high similarity) | 🟢 Green |
| 50-74% | Partial match (medium similarity) | 🟡 Yellow |
| 25-49% | Low match (low similarity) | 🟠 Orange |
| 0-24% | No match (new translation) | 🔴 Red |

## Creating Your Own Test Files

To create a custom test file:

1. **Choose Format**: Pick from supported formats (XLIFF, JSON, PO, etc.)
2. **Add Segments**: Include source and target text pairs
3. **Set Match Percentages**: Add match quality indicators where applicable
4. **Validate**: Ensure proper XML/JSON syntax
5. **Upload**: Use the file uploader in the application

## Supported File Types

- **XLIFF Variants**: `.xliff`, `.xlf`, `.xml` (with XLIFF content)
- **Trados**: `.sdlxliff`
- **MemoQ**: `.mqxliff`
- **Memsource**: `.mxliff`
- **JSON**: `.json`
- **PO Files**: `.po`
- **Translation Packages**: `.xlz`, `.wsxz`, `.sdlppx`, `.sdlrpx`, `.mqout`

## Tips for Testing

1. **Test Different Formats**: Upload each sample file type to ensure format support
2. **Check Match Extraction**: Verify match percentages are correctly extracted from different attributes
3. **Filter by Match %**: Use the dashboard filters to test match percentage filtering
4. **Export Results**: Test JSON and CSV export functionality
5. **Run QA Checks**: Execute different QA check types on the segments
6. **AI Predictions**: Test AI-powered analysis (requires API key configuration)

## Troubleshooting

If you encounter issues:

1. **File Not Recognized**: Ensure the file extension matches the content format
2. **Match % Not Showing**: Verify the source file includes match quality attributes
3. **Upload Fails**: Check file size (max 50MB) and format validity
4. **Parsing Errors**: Validate XML/JSON syntax using online validators

## Next Steps

After testing with sample files:

1. Configure AI API keys (OpenAI GPT-4 or Google Gemini)
2. Run AI-powered predictions for advanced analysis
3. Create custom checklist rules for your organization
4. Set up automated QA workflows
5. Export and analyze results for reporting

---

**Last Updated**: 2024
**Format Support**: Comprehensive
**Ready for Production**: Yes ✅
