// Content script for AI Bias Detector
// Handles text extraction from web pages

class ArticleExtractor {
    constructor() {
        this.selectors = {
            // Semantic HTML5 elements
            article: 'article',
            main: 'main',
            
            // Common content class names
            content: [
                '.content',
                '.article-content',
                '.post-content',
                '.entry-content',
                '.article-body',
                '.post-body',
                '.story-body',
                '.article-text',
                '.content-body',
                '.main-content'
            ],
            
            // Paragraph containers
            paragraphs: 'p',
            
            // Elements to exclude
            exclude: [
                'nav',
                'header',
                'footer',
                'aside',
                '.sidebar',
                '.navigation',
                '.menu',
                '.ads',
                '.advertisement',
                '.comments',
                '.social',
                '.share',
                '.related',
                '.recommended',
                '.popup',
                '.modal',
                'script',
                'style',
                'noscript'
            ]
        };
        
        this.isInitialized = false;
        this.initialize();
    }

    /**
     * Initialize the content script
     */
    initialize() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.setupMessageListener();
                });
            } else {
                this.setupMessageListener();
            }
            
            this.isInitialized = true;
            console.log('AI Bias Detector content script initialized successfully');
            
        } catch (error) {
            console.error('Error initializing content script:', error);
        }
    }

    /**
     * Setup message listener for communication with background script
     */
    setupMessageListener() {
        try {
            // Listen for messages from background script
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                console.log('Content script received message:', request);
                
                if (request.action === 'ping') {
                    // Respond to ping to confirm content script is active
                    sendResponse({ pong: true });
                    return true;
                }
                
                if (request.action === 'extractText') {
                    this.handleExtractTextRequest(sendResponse);
                    return true; // Keep message channel open for async response
                }
                
                return false;
            });
            
            console.log('Message listener setup complete');
            
        } catch (error) {
            console.error('Error setting up message listener:', error);
        }
    }

    /**
     * Handle text extraction request from background script
     * @param {Function} sendResponse Response callback
     */
    async handleExtractTextRequest(sendResponse) {
        try {
            console.log('Processing text extraction request...');
            
            // Add a small delay to ensure page is fully loaded
            await this.waitForPageLoad();
            
            const result = this.extractArticleText();
            
            console.log('Text extraction result:', {
                success: result.success,
                textLength: result.text ? result.text.length : 0,
                wordCount: result.wordCount || 0,
                method: result.extractionMethod || 'unknown'
            });
            
            // Ensure we always send a response
            if (typeof sendResponse === 'function') {
                sendResponse(result);
            } else {
                console.error('sendResponse is not a function');
            }
            
        } catch (error) {
            console.error('Error in handleExtractTextRequest:', error);
            
            const errorResult = {
                success: false,
                error: `Text extraction failed: ${error.message}`,
                text: '',
                wordCount: 0,
                url: window.location.href
            };
            
            if (typeof sendResponse === 'function') {
                sendResponse(errorResult);
            }
        }
    }

    /**
     * Wait for page to be fully loaded
     */
    async waitForPageLoad() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                const checkComplete = () => {
                    if (document.readyState === 'complete') {
                        resolve();
                    } else {
                        setTimeout(checkComplete, 100);
                    }
                };
                checkComplete();
            }
        });
    }

    /**
     * Extract the main article text from the current page
     * @returns {Object} Extraction result with text and metadata
     */
    extractArticleText() {
        try {
            console.log('Starting article text extraction...');
            
            // First, try semantic HTML elements
            let contentElement = this.findSemanticContent();
            
            // If no semantic content found, try common class names
            if (!contentElement) {
                contentElement = this.findContentByClass();
            }
            
            // If still no content, use heuristic analysis
            if (!contentElement) {
                contentElement = this.findContentByHeuristics();
            }
            
            // Last resort: try to extract from paragraphs
            if (!contentElement) {
                contentElement = this.findContentFromParagraphs();
            }
            
            if (!contentElement) {
                console.warn('No suitable content element found');
                return {
                    success: false,
                    error: 'No article content found on this page. This might not be an article page.',
                    text: '',
                    wordCount: 0,
                    url: window.location.href,
                    title: document.title
                };
            }
            
            // Extract and clean text
            const extractedText = this.extractTextFromElement(contentElement);
            const cleanedText = this.cleanText(extractedText);
            
            console.log('Extracted text length:', cleanedText.length);
            
            if (cleanedText.length < 100) {
                return {
                    success: false,
                    error: 'Article content too short for analysis (minimum 100 characters required)',
                    text: cleanedText,
                    wordCount: this.countWords(cleanedText),
                    url: window.location.href,
                    title: document.title
                };
            }
            
            const result = {
                success: true,
                text: cleanedText,
                wordCount: this.countWords(cleanedText),
                url: window.location.href,
                title: document.title,
                extractionMethod: contentElement.dataset.extractionMethod || 'unknown'
            };
            
            console.log('Text extraction successful:', {
                wordCount: result.wordCount,
                method: result.extractionMethod
            });
            
            return result;
            
        } catch (error) {
            console.error('Error extracting article text:', error);
            return {
                success: false,
                error: 'Failed to extract article text: ' + error.message,
                text: '',
                wordCount: 0,
                url: window.location.href,
                title: document.title
            };
        }
    }

    /**
     * Find content using semantic HTML5 elements
     * @returns {Element|null} Content element or null
     */
    findSemanticContent() {
        console.log('Trying semantic content extraction...');
        
        // Try article element first
        const article = document.querySelector(this.selectors.article);
        if (article && this.isValidContent(article)) {
            console.log('Found content in <article> element');
            article.dataset.extractionMethod = 'semantic-article';
            return article;
        }
        
        // Try main element
        const main = document.querySelector(this.selectors.main);
        if (main && this.isValidContent(main)) {
            console.log('Found content in <main> element');
            main.dataset.extractionMethod = 'semantic-main';
            return main;
        }
        
        return null;
    }

    /**
     * Find content using common class names
     * @returns {Element|null} Content element or null
     */
    findContentByClass() {
        console.log('Trying class-based content extraction...');
        
        for (const selector of this.selectors.content) {
            const element = document.querySelector(selector);
            if (element && this.isValidContent(element)) {
                console.log('Found content using selector:', selector);
                element.dataset.extractionMethod = 'class-based';
                return element;
            }
        }
        return null;
    }

    /**
     * Find content using heuristic analysis
     * @returns {Element|null} Content element or null
     */
    findContentByHeuristics() {
        console.log('Trying heuristic content extraction...');
        
        const candidates = [];
        
        // Get all potential content containers
        const containers = document.querySelectorAll('div, section, article, main');
        
        containers.forEach(container => {
            if (this.shouldExcludeElement(container)) return;
            
            const score = this.calculateContentScore(container);
            if (score > 0) {
                candidates.push({ element: container, score });
            }
        });
        
        // Sort by score and return the best candidate
        candidates.sort((a, b) => b.score - a.score);
        
        if (candidates.length > 0 && candidates[0].score > 10) {
            console.log('Found content using heuristics, score:', candidates[0].score);
            candidates[0].element.dataset.extractionMethod = 'heuristic';
            return candidates[0].element;
        }
        
        return null;
    }

    /**
     * Find content from paragraphs as last resort
     * @returns {Element|null} Content element or null
     */
    findContentFromParagraphs() {
        console.log('Trying paragraph-based content extraction...');
        
        const paragraphs = document.querySelectorAll('p');
        if (paragraphs.length < 3) {
            return null;
        }
        
        // Create a virtual container with all meaningful paragraphs
        const container = document.createElement('div');
        let totalText = '';
        
        paragraphs.forEach(p => {
            const text = p.textContent.trim();
            if (text.length > 50 && !this.shouldExcludeElement(p.parentElement)) {
                container.appendChild(p.cloneNode(true));
                totalText += text + ' ';
            }
        });
        
        if (totalText.length > 200) {
            console.log('Found content from paragraphs');
            container.dataset.extractionMethod = 'paragraphs';
            return container;
        }
        
        return null;
    }

    /**
     * Calculate content score for heuristic analysis
     * @param {Element} element Element to score
     * @returns {number} Content score
     */
    calculateContentScore(element) {
        let score = 0;
        
        // Count paragraphs
        const paragraphs = element.querySelectorAll('p');
        score += paragraphs.length * 2;
        
        // Count text length
        const textLength = element.textContent.trim().length;
        score += Math.min(textLength / 100, 20);
        
        // Bonus for article-related attributes
        const className = element.className.toLowerCase();
        const id = element.id.toLowerCase();
        
        if (className.includes('content') || className.includes('article') || 
            className.includes('post') || className.includes('story')) {
            score += 10;
        }
        
        if (id.includes('content') || id.includes('article') || 
            id.includes('post') || id.includes('story')) {
            score += 10;
        }
        
        // Penalty for navigation/sidebar elements
        if (className.includes('nav') || className.includes('sidebar') || 
            className.includes('menu') || className.includes('footer')) {
            score -= 20;
        }
        
        // Bonus for being in the center of the page
        try {
            const rect = element.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const elementCenter = rect.left + rect.width / 2;
            const viewportCenter = viewportWidth / 2;
            const centerDistance = Math.abs(elementCenter - viewportCenter);
            
            if (centerDistance < viewportWidth * 0.3) {
                score += 5;
            }
        } catch (error) {
            // Ignore positioning errors
        }
        
        return score;
    }

    /**
     * Check if an element should be excluded from analysis
     * @param {Element} element Element to check
     * @returns {boolean} True if should be excluded
     */
    shouldExcludeElement(element) {
        if (!element) return true;
        
        const tagName = element.tagName.toLowerCase();
        const className = element.className.toLowerCase();
        const id = element.id.toLowerCase();
        
        // Check tag names
        if (['nav', 'header', 'footer', 'aside', 'script', 'style'].includes(tagName)) {
            return true;
        }
        
        // Check class names and IDs
        const excludeKeywords = ['nav', 'menu', 'sidebar', 'ads', 'advertisement', 
                                'comments', 'social', 'share', 'popup', 'modal'];
        
        for (const keyword of excludeKeywords) {
            if (className.includes(keyword) || id.includes(keyword)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if an element contains valid content
     * @param {Element} element Element to validate
     * @returns {boolean} True if valid content
     */
    isValidContent(element) {
        if (!element) return false;
        
        const text = element.textContent.trim();
        const paragraphs = element.querySelectorAll('p');
        
        // Must have sufficient text and paragraphs
        return text.length > 200 && paragraphs.length >= 2;
    }

    /**
     * Extract text from an element while preserving structure
     * @param {Element} element Element to extract text from
     * @returns {string} Extracted text
     */
    extractTextFromElement(element) {
        // Clone the element to avoid modifying the original
        const clone = element.cloneNode(true);
        
        // Remove excluded elements
        this.selectors.exclude.forEach(selector => {
            try {
                const elements = clone.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            } catch (error) {
                // Ignore selector errors
            }
        });
        
        // Get text content and preserve paragraph breaks
        const paragraphs = clone.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
        let text = '';
        
        paragraphs.forEach(p => {
            const pText = p.textContent.trim();
            if (pText.length > 0) {
                text += pText + '\n\n';
            }
        });
        
        // If no paragraphs found, use all text content
        if (text.trim().length === 0) {
            text = clone.textContent;
        }
        
        return text;
    }

    /**
     * Clean extracted text
     * @param {string} text Raw extracted text
     * @returns {string} Cleaned text
     */
    cleanText(text) {
        if (!text) return '';
        
        return text
            // Remove excessive whitespace
            .replace(/\s+/g, ' ')
            // Remove excessive line breaks
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            // Trim
            .trim();
    }

    /**
     * Count words in text
     * @param {string} text Text to count words in
     * @returns {number} Word count
     */
    countWords(text) {
        if (!text) return 0;
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
}

// Initialize extractor when script loads
let extractor;

try {
    extractor = new ArticleExtractor();
    console.log('AI Bias Detector content script loaded successfully');
} catch (error) {
    console.error('Error loading AI Bias Detector content script:', error);
}

// Fallback message listener in case the class initialization fails
if (!extractor || !extractor.isInitialized) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Fallback message listener activated');
        
        if (request.action === 'ping') {
            sendResponse({ pong: true });
            return true;
        }
        
        if (request.action === 'extractText') {
            try {
                // Simple fallback extraction
                const bodyText = document.body.textContent || document.body.innerText || '';
                const cleanText = bodyText.replace(/\s+/g, ' ').trim();
                
                if (cleanText.length > 100) {
                    sendResponse({
                        success: true,
                        text: cleanText.substring(0, 5000), // Limit to 5000 chars
                        wordCount: cleanText.split(/\s+/).length,
                        url: window.location.href,
                        title: document.title,
                        extractionMethod: 'fallback'
                    });
                } else {
                    sendResponse({
                        success: false,
                        error: 'Page content too short for analysis',
                        text: cleanText,
                        wordCount: 0,
                        url: window.location.href,
                        title: document.title
                    });
                }
            } catch (error) {
                sendResponse({
                    success: false,
                    error: 'Fallback extraction failed: ' + error.message,
                    text: '',
                    wordCount: 0,
                    url: window.location.href,
                    title: document.title
                });
            }
            
            return true;
        }
        
        return false;
    });
}

