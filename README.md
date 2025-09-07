# AI Bias Detector Chrome Extension

A Chrome extension that analyzes web articles for potential bias using AI-powered detection algorithms. This tool helps users develop critical thinking skills and media literacy by identifying various forms of bias in online content.

## Features

- **Smart Content Extraction**: Automatically identifies and extracts main article content from web pages
- **AI-Powered Analysis**: Uses Google Perspective API and OpenAI Moderation API for comprehensive bias detection
- **Multiple Bias Categories**: Detects toxicity, identity attacks, political bias, and other forms of problematic content
- **User-Friendly Interface**: Clean, accessible popup interface with clear results presentation
- **Local Fallback**: Provides basic keyword-based analysis when API keys are not configured
- **Privacy-Focused**: Processes content securely and respects user privacy

## Installation

### For Development/Testing

1. **Download the Extension Files**
   - Clone or download all files from this repository
   - Ensure you have all required files: `manifest.json`, `popup.html`, `popup.css`, `popup.js`, `content.js`, `background.js`, and the `icons/` folder

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked" and select the extension folder
   - The AI Bias Detector icon should appear in your extensions toolbar

3. **Configure API Keys (Optional but Recommended)**
   - Right-click the extension icon and select "Options" (when available)
   - Or use the Settings link in the popup
   - Add your Google Perspective API key and/or OpenAI API key
   - Without API keys, the extension will use local keyword-based analysis

### For Production Use

The extension can be packaged and submitted to the Chrome Web Store following Google's extension publishing guidelines.

## Usage

1. **Navigate to an Article**
   - Visit any webpage containing an article (news sites, blogs, etc.)

2. **Analyze for Bias**
   - Click the AI Bias Detector extension icon
   - Click the "Scan Article" button
   - Wait for the analysis to complete (usually 5-15 seconds)

3. **Review Results**
   - View the overall bias level (Low/Medium/High)
   - Check specific bias categories detected
   - Read the explanation of findings
   - Note the confidence level of the analysis

4. **Take Action**
   - Use results to inform your reading and interpretation
   - Consider seeking additional sources for highly biased content
   - Develop critical thinking about media consumption

## API Configuration

### Google Perspective API

1. Visit the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Perspective Comment Analyzer API
4. Create credentials (API key)
5. Add the API key to the extension settings

### OpenAI API

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account and navigate to API keys
3. Generate a new API key
4. Add the API key to the extension settings

**Note**: API usage may incur costs. Check the respective platforms for pricing information.

## Technical Details

### Architecture

- **Content Script** (`content.js`): Extracts article text from web pages using intelligent DOM analysis
- **Background Script** (`background.js`): Handles API communication, caching, and message routing
- **Popup Interface** (`popup.html/css/js`): Provides user interface for initiating scans and viewing results

### Content Extraction

The extension uses a multi-layered approach to identify article content:

1. **Semantic HTML**: Looks for `<article>` and `<main>` elements
2. **Class-based Detection**: Searches for common content class names
3. **Heuristic Analysis**: Analyzes DOM structure, text density, and positioning
4. **Content Filtering**: Removes navigation, ads, comments, and other non-article elements

### Bias Detection

The extension analyzes content for various bias indicators:

- **Toxicity**: Harmful or offensive language
- **Identity Attacks**: Content targeting individuals based on identity
- **Insults**: Insulting or demeaning language
- **Political Bias**: Partisan language and framing
- **Threats**: Threatening language
- **Profanity**: Inappropriate language

### Privacy and Security

- API keys are stored locally using Chrome's secure storage
- Article content is sent to APIs only for analysis purposes
- No user identification or browsing history is transmitted
- Results are cached locally to minimize API calls
- All communication uses HTTPS encryption

## File Structure

```
ai-bias-detector/
├── manifest.json          # Extension configuration
├── popup.html            # Popup interface HTML
├── popup.css             # Popup interface styles
├── popup.js              # Popup interface logic
├── content.js            # Content extraction script
├── background.js         # Background service worker
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── test-article.html     # Test page for development
└── README.md            # This file
```

## Development

### Testing

1. **Load Test Article**
   ```bash
   cd ai-bias-detector
   python3 -m http.server 8080
   ```
   Navigate to `http://localhost:8080/test-article.html`

2. **Test Content Extraction**
   - Open browser console on the test page
   - Run the content extraction test script
   - Verify proper text extraction and word count

3. **Test Extension Functionality**
   - Load the extension in Chrome
   - Test on various websites with different layouts
   - Verify proper bias detection and result display

### Customization

- **Add New Bias Categories**: Modify the analysis logic in `background.js`
- **Improve Content Extraction**: Enhance algorithms in `content.js`
- **Customize UI**: Modify `popup.html`, `popup.css`, and `popup.js`
- **Add New APIs**: Integrate additional bias detection services

## Limitations

- **Content Extraction**: May not work perfectly on all website layouts
- **API Dependencies**: Requires API keys for full functionality
- **Language Support**: Primarily designed for English content
- **Bias Detection**: AI analysis is not perfect and should be used as a tool, not definitive judgment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source. Please check the license file for specific terms.

## Support

For issues, questions, or feature requests:
- Check the browser console for error messages
- Verify API key configuration
- Test on different websites
- Report bugs with specific examples

## Changelog

### Version 1.0.0
- Initial release
- Basic bias detection functionality
- Google Perspective API integration
- OpenAI Moderation API integration
- Smart content extraction
- Local fallback analysis
- Responsive popup interface

## Acknowledgments

- Google Perspective API for toxicity detection
- OpenAI for content moderation capabilities
- Chrome Extensions API documentation
- Open source community for inspiration and best practices

---

**Disclaimer**: This tool is designed to assist with critical thinking about media content. It should not be considered a definitive judgment of bias or quality. Users should always apply their own critical thinking and seek multiple sources when evaluating information.

