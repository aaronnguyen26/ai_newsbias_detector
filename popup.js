// Popup script for AI Bias Detector
// Handles UI interactions and communication with background script

class PopupController {
    constructor() {
        this.currentState = 'initial';
        this.analysisResult = null;
        
        // Google Custom Search API configuration
        this.GOOGLE_SEARCH_API_KEY = 'AIzaSyAE5zikuHS9oVD5aDoKFmtpc9SXb8-qvDE';
        this.GOOGLE_SEARCH_ENGINE_ID = '017576662512468239146:omuauf_lfve'; // Default search engine ID
        
        this.initializeElements();
        this.attachEventListeners();
        this.showServiceInfo();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        // State containers
        this.states = {
            initial: document.getElementById('initial-state'),
            loading: document.getElementById('loading-state'),
            results: document.getElementById('results-state'),
            error: document.getElementById('error-state')
        };

        // Buttons
        this.buttons = {
            scan: document.getElementById('scan-button'),
            cancel: document.getElementById('cancel-button'),
            newScan: document.getElementById('new-scan-button'),
            retry: document.getElementById('retry-button')
        };

        // Result elements
        this.resultElements = {
            overallScore: document.getElementById('overall-score'),
            categoriesList: document.getElementById('categories-list'),
            explanationText: document.getElementById('explanation-text'),
            confidenceLevel: document.getElementById('confidence-level'),
            errorMessage: document.getElementById('error-message'),
            biasScoreNumber: document.getElementById('bias-score-number'),
            progressCircle: document.getElementById('progress-circle'),
            alternativeArticles: document.getElementById('alternative-articles'),
            alternativeArticlesList: document.getElementById('alternative-articles-list')
        };

        // Footer links
        this.footerLinks = {
            help: document.getElementById('help-link'),
            about: document.getElementById('about-link')
        };
    }

    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        // Main action buttons
        this.buttons.scan?.addEventListener('click', () => this.startAnalysis());
        this.buttons.cancel?.addEventListener('click', () => this.cancelAnalysis());
        this.buttons.newScan?.addEventListener('click', () => this.resetToInitial());
        this.buttons.retry?.addEventListener('click', () => this.startAnalysis());

        // Footer links
        this.footerLinks.help?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openHelp();
        });

        this.footerLinks.about?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openAbout();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.currentState === 'initial') {
                this.startAnalysis();
            } else if (e.key === 'Escape') {
                if (this.currentState === 'loading') {
                    this.cancelAnalysis();
                }
            }
        });
    }

    /**
     * Show service information
     */
    showServiceInfo() {
        const description = document.querySelector('.description');
        if (description) {
            description.innerHTML = `
                Analyze articles for potential bias using AI-powered detection.
                <br><small style="color: #4a90e2;">✓ Powered by cloud service - no setup required!</small>
            `;
        }
    }

    /**
     * Start bias analysis
     */
    async startAnalysis() {
        try {
            this.setState('loading');
            
            // Send message to background script to extract and analyze
            const result = await this.sendMessage({
                action: 'extractAndAnalyze'
            });

            if (result.success) {
                this.analysisResult = result;
                this.displayResults(result);
                this.setState('results');
            } else {
                this.displayError(result.error || 'Analysis failed');
                this.setState('error');
            }

        } catch (error) {
            console.error('Analysis error:', error);
            this.displayError('Failed to analyze article: ' + error.message);
            this.setState('error');
        }
    }

    /**
     * Cancel ongoing analysis
     */
    cancelAnalysis() {
        this.setState('initial');
    }

    /**
     * Reset to initial state
     */
    resetToInitial() {
        this.analysisResult = null;
        this.setState('initial');
    }

    /**
     * Set the current UI state
     * @param {string} stateName Name of the state to activate
     */
    setState(stateName) {
        // Hide all states
        Object.values(this.states).forEach(state => {
            if (state) state.classList.remove('active');
        });

        // Show target state
        if (this.states[stateName]) {
            this.states[stateName].classList.add('active');
            this.currentState = stateName;
        }
    }

    /**
     * Display analysis results
     * @param {Object} result Analysis result object
     */
    displayResults(result) {
        // Calculate bias score out of 100
        const biasScore = this.calculateBiasScore(result);
        
        // Update circular bias score
        this.updateCircularScore(biasScore);
        
        // Overall score
        if (this.resultElements.overallScore) {
            this.resultElements.overallScore.textContent = this.capitalizeFirst(result.overallScore);
            this.resultElements.overallScore.className = `score-value ${result.overallScore}`;
        }

        // Categories
        if (this.resultElements.categoriesList) {
            this.resultElements.categoriesList.innerHTML = '';
            
            if (result.categories && result.categories.length > 0) {
                result.categories.forEach(category => {
                    const categoryElement = this.createCategoryElement(category);
                    this.resultElements.categoriesList.appendChild(categoryElement);
                });
            } else {
                this.resultElements.categoriesList.innerHTML = '<p class="no-categories">No specific bias categories detected.</p>';
            }
        }

        // Explanation
        if (this.resultElements.explanationText) {
            this.resultElements.explanationText.textContent = result.explanation || 'No explanation available.';
        }

        // Confidence
        if (this.resultElements.confidenceLevel) {
            this.resultElements.confidenceLevel.textContent = this.capitalizeFirst(result.confidence);
            this.resultElements.confidenceLevel.className = `confidence-value ${result.confidence}`;
        }

        // Search for alternative articles if bias is detected
        if (biasScore > 30) { // Show alternatives if bias score is above 30
            this.searchAlternativeArticles(result);
        } else {
            // Hide alternative articles section if bias is low
            if (this.resultElements.alternativeArticles) {
                this.resultElements.alternativeArticles.style.display = 'none';
            }
        }

        // Add API usage info
        this.addApiUsageInfo(result);
    }

    /**
     * Create category element for display
     * @param {Object} category Category data
     * @returns {HTMLElement} Category element
     */
    createCategoryElement(category) {
        const element = document.createElement('div');
        element.className = `category-item ${category.detected ? 'detected' : ''}`;
        
        const score = Math.round(category.score * 100);
        const scoreText = category.detected ? `${score}%` : 'Not detected';
        
        element.innerHTML = `
            <span class="category-name">${this.capitalizeFirst(category.name)}</span>
            <span class="category-score">${scoreText}</span>
        `;
        
        return element;
    }

    /**
     * Add API usage information to results
     * @param {Object} result Analysis result
     */
    addApiUsageInfo(result) {
        const apiInfo = document.createElement('div');
        apiInfo.className = 'api-info';
        
        const apiUsed = result.apiUsed || [];
        let apiText = 'Analysis performed';
        
        if (apiUsed.includes('perspective')) {
            apiText = '✓ Analysis powered by Google Perspective AI';
        } else if (apiUsed.includes('backend')) {
            apiText = '✓ Analysis powered by cloud service';
        } else if (apiUsed.length > 0) {
            apiText = `Analysis powered by: ${apiUsed.join(', ').toUpperCase()}`;
        }
            
        apiInfo.innerHTML = `<small style="color: #4a90e2;">${apiText}</small>`;
        
        // Add to results container
        const resultsContainer = this.states.results;
        if (resultsContainer && !resultsContainer.querySelector('.api-info')) {
            resultsContainer.appendChild(apiInfo);
        }
    }

    /**
     * Calculate bias score out of 100 based on analysis result
     * @param {Object} result Analysis result
     * @returns {number} Bias score (0-100)
     */
    calculateBiasScore(result) {
        let score = 0;
        
        // Base score on overall bias level
        switch (result.overallScore) {
            case 'low':
                score = 15;
                break;
            case 'medium':
                score = 50;
                break;
            case 'high':
                score = 85;
                break;
            default:
                score = 25;
        }
        
        // Adjust based on detected categories
        if (result.categories && result.categories.length > 0) {
            const detectedCategories = result.categories.filter(cat => cat.detected);
            const avgCategoryScore = detectedCategories.reduce((sum, cat) => sum + (cat.score * 100), 0) / detectedCategories.length;
            
            if (avgCategoryScore > 0) {
                score = Math.max(score, avgCategoryScore);
            }
        }
        
        // Ensure score is within bounds
        return Math.min(100, Math.max(0, Math.round(score)));
    }

    /**
     * Update circular bias score with animation
     * @param {number} score Bias score (0-100)
     */
    updateCircularScore(score) {
        if (!this.resultElements.biasScoreNumber || !this.resultElements.progressCircle) {
            return;
        }
        
        // Update score number with animation
        this.animateNumber(this.resultElements.biasScoreNumber, 0, score, 1500);
        
        // Update circular progress
        const circumference = 2 * Math.PI * 50; // radius = 50
        const offset = circumference - (score / 100) * circumference;
        
        // Set initial state
        this.resultElements.progressCircle.style.strokeDashoffset = circumference;
        
        // Animate to final state
        setTimeout(() => {
            this.resultElements.progressCircle.style.strokeDashoffset = offset;
            
            // Change color based on score
            if (score < 30) {
                this.resultElements.progressCircle.style.stroke = '#10b981'; // Green
            } else if (score < 70) {
                this.resultElements.progressCircle.style.stroke = '#f59e0b'; // Yellow
            } else {
                this.resultElements.progressCircle.style.stroke = '#ef4444'; // Red
            }
        }, 100);
    }

    /**
     * Animate number from start to end
     * @param {HTMLElement} element Element to animate
     * @param {number} start Start number
     * @param {number} end End number
     * @param {number} duration Animation duration in ms
     */
    animateNumber(element, start, end, duration) {
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (end - start) * easeOut);
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Search for alternative articles using Google Custom Search API
     * @param {Object} result Analysis result
     */
    async searchAlternativeArticles(result) {
        try {
            // Extract keywords from the current page title or content
            const searchQuery = await this.extractSearchQuery();
            
            if (!searchQuery) {
                console.log('No search query available for alternative articles');
                return;
            }
            
            console.log('Searching for alternative articles with query:', searchQuery);
            
            // Perform Google Custom Search
            const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${this.GOOGLE_SEARCH_API_KEY}&cx=${this.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}&num=3`;
            
            const response = await fetch(searchUrl);
            const data = await response.json();
            
            if (data.items && data.items.length > 0) {
                this.displayAlternativeArticles(data.items);
            } else {
                console.log('No alternative articles found');
            }
            
        } catch (error) {
            console.error('Error searching for alternative articles:', error);
        }
    }

    /**
     * Extract search query from current page
     * @returns {Promise<string>} Search query
     */
    async extractSearchQuery() {
        try {
            // Get current tab information
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs && tabs.length > 0) {
                const tab = tabs[0];
                
                // Extract keywords from title
                let query = tab.title;
                
                // Clean up the title
                query = query.replace(/\s*-\s*.*$/, ''); // Remove site name after dash
                query = query.replace(/\s*\|\s*.*$/, ''); // Remove site name after pipe
                query = query.replace(/[^\w\s]/g, ' '); // Remove special characters
                query = query.replace(/\s+/g, ' ').trim(); // Normalize whitespace
                
                // Limit to first few words for better search results
                const words = query.split(' ').slice(0, 5);
                return words.join(' ');
            }
        } catch (error) {
            console.error('Error extracting search query:', error);
        }
        
        return null;
    }

    /**
     * Display alternative articles in the UI
     * @param {Array} articles Array of search result items
     */
    displayAlternativeArticles(articles) {
        if (!this.resultElements.alternativeArticles || !this.resultElements.alternativeArticlesList) {
            return;
        }
        
        // Clear existing articles
        this.resultElements.alternativeArticlesList.innerHTML = '';
        
        // Add each article
        articles.forEach(article => {
            const articleElement = this.createAlternativeArticleElement(article);
            this.resultElements.alternativeArticlesList.appendChild(articleElement);
        });
        
        // Show the alternative articles section
        this.resultElements.alternativeArticles.style.display = 'block';
    }

    /**
     * Create alternative article element
     * @param {Object} article Search result item
     * @returns {HTMLElement} Article element
     */
    createAlternativeArticleElement(article) {
        const element = document.createElement('div');
        element.className = 'alt-article-item';
        
        // Extract domain from URL
        const domain = new URL(article.link).hostname.replace('www.', '');
        
        element.innerHTML = `
            <div class="alt-article-title">${article.title}</div>
            <div class="alt-article-source">${domain}</div>
            <div class="alt-article-snippet">${article.snippet}</div>
        `;
        
        // Add click handler to open article
        element.addEventListener('click', () => {
            chrome.tabs.create({ url: article.link });
        });
        
        return element;
    }

    /**
     * Display error message
     * @param {string} message Error message
     */
    displayError(message) {
        if (this.resultElements.errorMessage) {
            this.resultElements.errorMessage.textContent = message;
        }
    }

    /**
     * Open help page
     */
    openHelp() {
        const helpText = `
AI Bias Detector Help:

🔍 How to Use:
1. Navigate to any article or blog post
2. Click "Scan Article" to analyze for potential bias
3. Review the results and explanations
4. Use findings to inform your critical thinking

📊 What We Analyze:
- Toxicity and harmful language
- Identity-based attacks
- Political bias indicators
- Emotional manipulation
- Factual vs. opinion content

🎯 Bias Categories:
- Toxicity: Harmful or offensive language
- Identity Attack: Targeting based on identity
- Political: Partisan language and framing
- Insult: Demeaning language
- Threat: Threatening content

⚙️ Technical Notes:
- Powered by Google Perspective AI in the cloud
- No setup or API keys required
- Results cached for faster performance
- Works on most news sites and blogs

💡 Remember:
This tool helps develop critical thinking skills. It's not a definitive judgment of bias - always consider multiple sources and perspectives when evaluating information.
        `;
        
        alert(helpText);
    }

    /**
     * Open about page
     */
    openAbout() {
        const aboutText = `
AI Bias Detector

Version: 1.0
Powered by: Google Perspective AI

This extension helps users identify potential bias in online articles and content. It uses advanced AI technology to analyze text for various forms of bias, including toxicity, identity attacks, and other problematic content patterns.

Features:
• Real-time bias analysis
• Multiple bias category detection
• Detailed explanations
• Privacy-focused design
• No personal data collection

The extension is designed to promote critical thinking and media literacy, helping users make more informed decisions about the content they consume.

For support or feedback, please visit our website.
        `;
        
        alert(aboutText);
    }

    /**
     * Send message to background script
     * @param {Object} message Message to send
     * @returns {Promise} Promise resolving to response
     */
    sendMessage(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Capitalize first letter of string
     * @param {string} str String to capitalize
     * @returns {string} Capitalized string
     */
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});

// Handle popup visibility
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Popup became visible, refresh if needed
        console.log('Popup visible');
    }
});

console.log('AI Bias Detector popup script loaded with cloud service support');

