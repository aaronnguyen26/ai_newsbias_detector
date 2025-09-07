// Background script for AI Bias Detector
// Handles communication between content script, popup, and backend service

class BiasDetectionService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
        this.backendUrl = 'https://19hninc006eg.manus.space/api/bias';
        
        console.log('AI Bias Detector background service initialized');
        console.log('Backend URL:', this.backendUrl);
    }

    /**
     * Extract text from current tab and analyze for bias
     * @returns {Promise<Object>} Analysis result
     */
    async extractAndAnalyze() {
        try {
            console.log('Starting extract and analyze process...');
            
            // Get current active tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tabs || tabs.length === 0) {
                throw new Error('No active tab found');
            }

            const tab = tabs[0];
            console.log('Active tab:', tab.url);

            // Check if we can inject content script
            if (!this.canInjectScript(tab.url)) {
                throw new Error('Cannot analyze this type of page. Please navigate to an article or blog post.');
            }

            // Ensure content script is injected
            await this.ensureContentScriptInjected(tab.id);

            // Extract text from the page
            console.log('Extracting text from page...');
            const extractionResult = await this.extractTextFromTab(tab.id);
            
            if (!extractionResult.success) {
                throw new Error(extractionResult.error || 'Failed to extract text from page');
            }

            console.log('Text extracted successfully:', {
                length: extractionResult.text.length,
                wordCount: extractionResult.wordCount
            });

            // Analyze the extracted text
            console.log('Analyzing text for bias...');
            const analysisResult = await this.analyzeText(extractionResult.text);
            
            // Combine extraction and analysis results
            return {
                success: true,
                ...analysisResult,
                extractionInfo: {
                    url: extractionResult.url,
                    title: extractionResult.title,
                    wordCount: extractionResult.wordCount,
                    extractionMethod: extractionResult.extractionMethod
                }
            };

        } catch (error) {
            console.error('Extract and analyze error:', error);
            return {
                success: false,
                error: error.message,
                overallScore: 'unknown',
                confidence: 'low',
                categories: [],
                explanation: 'Analysis failed: ' + error.message
            };
        }
    }

    /**
     * Ensure content script is injected into the tab
     * @param {number} tabId Tab ID
     */
    async ensureContentScriptInjected(tabId) {
        try {
            // Try to ping the content script first
            const response = await new Promise((resolve) => {
                chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
                    if (chrome.runtime.lastError) {
                        resolve(null);
                    } else {
                        resolve(response);
                    }
                });
            });

            if (response && response.pong) {
                console.log('Content script already active');
                return;
            }

            console.log('Injecting content script...');
            
            // Inject the content script manually
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            });

            console.log('Content script injected successfully');

            // Wait a bit for the script to initialize
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error('Error injecting content script:', error);
            throw new Error('Failed to inject content script. Please refresh the page and try again.');
        }
    }

    /**
     * Extract text from a specific tab
     * @param {number} tabId Tab ID
     * @returns {Promise<Object>} Extraction result
     */
    async extractTextFromTab(tabId) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Content script communication timeout. Please refresh the page and try again.'));
            }, 20000); // 20 second timeout

            // Send message to content script
            chrome.tabs.sendMessage(tabId, { action: 'extractText' }, (response) => {
                clearTimeout(timeout);
                
                if (chrome.runtime.lastError) {
                    console.error('Content script communication error:', chrome.runtime.lastError);
                    reject(new Error('Failed to communicate with page content. Please refresh the page and try again.'));
                } else if (!response) {
                    console.error('No response from content script');
                    reject(new Error('No response from page content. Please refresh the page and try again.'));
                } else {
                    console.log('Content script response:', {
                        success: response.success,
                        textLength: response.text ? response.text.length : 0,
                        error: response.error
                    });
                    resolve(response);
                }
            });
        });
    }

    /**
     * Analyze text for bias using backend service
     * @param {string} text Text to analyze
     * @returns {Promise<Object>} Analysis result
     */
    async analyzeText(text) {
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(text);
            const cachedResult = this.getFromCache(cacheKey);
            
            if (cachedResult) {
                console.log('Using cached analysis result');
                return cachedResult;
            }

            console.log('Sending text to backend service for analysis...');
            
            // Send to backend service
            const response = await fetch(`${this.backendUrl}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Backend service error:', response.status, errorText);
                throw new Error(`Backend service error: ${response.status}`);
            }

            const result = await response.json();
            console.log('Backend analysis result:', {
                success: result.success,
                overallScore: result.overallScore,
                categoriesCount: result.categories ? result.categories.length : 0,
                apiUsed: result.apiUsed
            });

            if (!result.success) {
                throw new Error(result.error || 'Backend analysis failed');
            }

            // Cache the result
            this.saveToCache(cacheKey, result);

            return result;

        } catch (error) {
            console.error('Analysis error:', error);
            
            // Return fallback result
            return {
                success: true,
                overallScore: 'unknown',
                confidence: 'low',
                categories: [],
                explanation: `Analysis temporarily unavailable: ${error.message}. Please try again later.`,
                apiUsed: ['error'],
                timestamp: Date.now()
            };
        }
    }

    /**
     * Check if we can inject content script into the given URL
     * @param {string} url URL to check
     * @returns {boolean} True if injection is allowed
     */
    canInjectScript(url) {
        if (!url) return false;
        
        // Block chrome:// and extension:// URLs
        if (url.startsWith('chrome://') || 
            url.startsWith('chrome-extension://') || 
            url.startsWith('moz-extension://') ||
            url.startsWith('edge://') ||
            url.startsWith('about:') ||
            url.startsWith('file://')) {
            return false;
        }

        // Allow http and https
        return url.startsWith('http://') || url.startsWith('https://');
    }

    /**
     * Generate cache key for text
     * @param {string} text Text to generate key for
     * @returns {string} Cache key
     */
    generateCacheKey(text) {
        // Simple hash function for caching
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Get result from cache
     * @param {string} key Cache key
     * @returns {Object|null} Cached result or null
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            return cached.result;
        }
        return null;
    }

    /**
     * Save result to cache
     * @param {string} key Cache key
     * @param {Object} result Result to cache
     */
    saveToCache(key, result) {
        this.cache.set(key, {
            result: result,
            timestamp: Date.now()
        });

        // Clean old entries if cache gets too large
        if (this.cache.size > 100) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }
}

// Initialize service
const biasService = new BiasDetectionService();

// Message listener for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background script received message:', request);

    if (request.action === 'extractAndAnalyze') {
        // Handle async operation
        biasService.extractAndAnalyze()
            .then(result => {
                console.log('Sending result to popup:', {
                    success: result.success,
                    overallScore: result.overallScore
                });
                sendResponse(result);
            })
            .catch(error => {
                console.error('Extract and analyze error:', error);
                sendResponse({
                    success: false,
                    error: error.message,
                    overallScore: 'unknown',
                    confidence: 'low',
                    categories: [],
                    explanation: 'Analysis failed: ' + error.message
                });
            });

        // Return true to indicate we'll send response asynchronously
        return true;
    }

    return false;
});

// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {
    console.log('AI Bias Detector installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        console.log('Extension installed for the first time');
    } else if (details.reason === 'update') {
        console.log('Extension updated to version:', chrome.runtime.getManifest().version);
    }
});

// Tab update listener (optional - for future features)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // Page finished loading - could be used for auto-analysis in future
        console.log('Page loaded:', tab.url);
    }
});

console.log('AI Bias Detector background script loaded with cloud service support');

