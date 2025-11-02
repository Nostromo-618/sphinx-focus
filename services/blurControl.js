/**
 * BlurControl - UI Engine for Selective Blur Effects
 * 
 * A reusable class that provides sophisticated blur control for UI elements.
 * Allows blurring everything on the page while keeping specific elements in focus.
 * 
 * @class BlurControl
 * @version 1.0.0
 */

class BlurControl {
    /**
     * Create a BlurControl instance
     * @param {Object} options - Configuration options
     * @param {string} options.blurAmount - CSS blur amount (default: '8px')
     * @param {string} options.transition - Transition timing (default: '0.3s ease')
     * @param {number} options.zIndexBase - Base z-index for focused elements (default: 9000)
     * @param {string} options.backdropColor - Backdrop overlay color (default: 'rgba(0, 0, 0, 0.3)')
     * @param {boolean} options.highlightFocused - Add highlight to focused elements (default: true)
     * @param {string} options.containerSelector - Container to blur (default: 'body')
     * @param {Array<string>} options.excludeSelectors - Default elements to keep in focus (default: [])
     */
    constructor(options = {}) {
        this.options = {
            blurAmount: '8px',
            transition: '0.3s ease',
            zIndexBase: 9000,
            backdropColor: 'rgba(0, 0, 0, 0.3)',
            highlightFocused: true,
            containerSelector: 'body',
            excludeSelectors: [],
            ...options
        };
        
        this.isActive = false;
        this.focusedElements = [];
        this.blurLayer = null;
        this.originalStyles = new Map();
        
        // Bind methods
        this.handleEscape = this.handleEscape.bind(this);
    }
    
    /**
     * Activate blur effect, keeping specified elements in focus
     * @param {Array<string>} excludeSelectors - CSS selectors for elements to keep in focus
     * @returns {BlurControl} - Returns this for method chaining
     */
    activate(excludeSelectors = []) {
        if (this.isActive) {
            this.updateFocusedElements(excludeSelectors);
            return this;
        }
        
        this.isActive = true;
        
        // Combine default and provided selectors
        const allExcludeSelectors = [
            ...this.options.excludeSelectors,
            ...excludeSelectors
        ];
        
        // Create blur layer
        this.createBlurLayer();
        
        // Set focused elements
        this.setFocusedElements(allExcludeSelectors);
        
        // Add escape key listener
        document.addEventListener('keydown', this.handleEscape);
        
        return this;
    }
    
    /**
     * Deactivate blur effect and restore normal state
     * @returns {BlurControl} - Returns this for method chaining
     */
    deactivate() {
        if (!this.isActive) {
            return this;
        }
        
        this.isActive = false;
        
        // Remove blur layer
        if (this.blurLayer && this.blurLayer.parentNode) {
            this.blurLayer.parentNode.removeChild(this.blurLayer);
            this.blurLayer = null;
        }
        
        // Restore focused elements
        this.restoreFocusedElements();
        
        // Remove escape key listener
        document.removeEventListener('keydown', this.handleEscape);
        
        return this;
    }
    
    /**
     * Toggle blur effect on/off
     * @param {Array<string>} excludeSelectors - CSS selectors for elements to keep in focus
     * @returns {BlurControl} - Returns this for method chaining
     */
    toggle(excludeSelectors = []) {
        if (this.isActive) {
            this.deactivate();
        } else {
            this.activate(excludeSelectors);
        }
        return this;
    }
    
    /**
     * Update which elements are in focus without deactivating
     * @param {Array<string>} excludeSelectors - New CSS selectors for elements to keep in focus
     * @returns {BlurControl} - Returns this for method chaining
     */
    updateFocusedElements(excludeSelectors) {
        if (!this.isActive) {
            return this;
        }
        
        // Restore previous focused elements
        this.restoreFocusedElements();
        
        // Set new focused elements
        const allExcludeSelectors = [
            ...this.options.excludeSelectors,
            ...excludeSelectors
        ];
        this.setFocusedElements(allExcludeSelectors);
        
        return this;
    }
    
    /**
     * Set blur amount dynamically
     * @param {string} amount - CSS blur amount (e.g., '10px')
     * @returns {BlurControl} - Returns this for method chaining
     */
    setBlurAmount(amount) {
        this.options.blurAmount = amount;
        if (this.blurLayer) {
            this.blurLayer.style.backdropFilter = `blur(${amount})`;
            this.blurLayer.style.webkitBackdropFilter = `blur(${amount})`;
        }
        return this;
    }
    
    /**
     * Set transition timing dynamically
     * @param {string} transition - CSS transition (e.g., '0.5s ease-in-out')
     * @returns {BlurControl} - Returns this for method chaining
     */
    setTransition(transition) {
        this.options.transition = transition;
        if (this.blurLayer) {
            this.blurLayer.style.transition = `opacity ${transition}`;
        }
        return this;
    }
    
    /**
     * Set backdrop color dynamically
     * @param {string} color - CSS color (e.g., 'rgba(0, 0, 0, 0.5)')
     * @returns {BlurControl} - Returns this for method chaining
     */
    setBackdropColor(color) {
        this.options.backdropColor = color;
        if (this.blurLayer) {
            this.blurLayer.style.backgroundColor = color;
        }
        return this;
    }
    
    /**
     * Check if blur is currently active
     * @returns {boolean} - True if blur is active
     */
    isBlurActive() {
        return this.isActive;
    }
    
    /**
     * Get array of currently focused elements
     * @returns {Array<HTMLElement>} - Array of focused elements
     */
    getFocusedElements() {
        return [...this.focusedElements];
    }
    
    /**
     * Clean up and remove all blur effects permanently
     */
    destroy() {
        this.deactivate();
        this.originalStyles.clear();
        this.focusedElements = [];
    }
    
    // Private methods
    
    /**
     * Create the blur overlay layer
     * @private
     */
    createBlurLayer() {
        this.blurLayer = document.createElement('div');
        this.blurLayer.className = 'blur-control-layer';
        this.blurLayer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: ${this.options.backdropColor};
            backdrop-filter: blur(${this.options.blurAmount});
            -webkit-backdrop-filter: blur(${this.options.blurAmount});
            z-index: ${this.options.zIndexBase};
            transition: opacity ${this.options.transition};
            pointer-events: none;
            opacity: 0;
        `;
        
        document.body.appendChild(this.blurLayer);
        
        // Trigger reflow for transition
        this.blurLayer.offsetHeight;
        this.blurLayer.style.opacity = '1';
    }
    
    /**
     * Set elements to keep in focus
     * @private
     * @param {Array<string>} selectors - CSS selectors
     */
    setFocusedElements(selectors) {
        this.focusedElements = [];
        
        selectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (!this.focusedElements.includes(element)) {
                        this.focusedElements.push(element);
                        this.applyFocusStyles(element);
                    }
                });
            } catch (error) {
                console.warn(`BlurControl: Invalid selector "${selector}"`, error);
            }
        });
    }
    
    /**
     * Apply focus styles to an element
     * @private
     * @param {HTMLElement} element - Element to focus
     */
    applyFocusStyles(element) {
        // Store original styles
        const originalStyle = {
            position: element.style.position,
            zIndex: element.style.zIndex,
            pointerEvents: element.style.pointerEvents,
            filter: element.style.filter,
            boxShadow: element.style.boxShadow,
            borderRadius: element.style.borderRadius
        };
        this.originalStyles.set(element, originalStyle);
        
        // Apply focus styles
        const computedPosition = window.getComputedStyle(element).position;
        if (computedPosition === 'static') {
            element.style.position = 'relative';
        }
        
        element.style.zIndex = String(this.options.zIndexBase + 1);
        element.style.pointerEvents = 'auto';
        element.style.filter = 'none';
        
        // Add highlight if enabled
        if (this.options.highlightFocused) {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const primaryColor = currentTheme === 'dark' ? '#818cf8' : '#6366f1';
            
            element.style.boxShadow = `
                0 0 0 3px ${primaryColor},
                0 10px 40px rgba(0, 0, 0, 0.3)
            `;
            
            // Preserve existing border radius or add default
            if (!element.style.borderRadius) {
                element.style.borderRadius = '12px';
            }
        }
        
        // Add class for additional styling
        element.classList.add('blur-control-focused');
    }
    
    /**
     * Restore original styles to focused elements
     * @private
     */
    restoreFocusedElements() {
        this.focusedElements.forEach(element => {
            const originalStyle = this.originalStyles.get(element);
            if (originalStyle) {
                // Restore original styles
                element.style.position = originalStyle.position;
                element.style.zIndex = originalStyle.zIndex;
                element.style.pointerEvents = originalStyle.pointerEvents;
                element.style.filter = originalStyle.filter;
                element.style.boxShadow = originalStyle.boxShadow;
                element.style.borderRadius = originalStyle.borderRadius;
            }
            
            // Remove class
            element.classList.remove('blur-control-focused');
        });
        
        this.focusedElements = [];
        this.originalStyles.clear();
    }
    
    /**
     * Handle escape key to deactivate blur
     * @private
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleEscape(event) {
        if (event.key === 'Escape' && this.isActive) {
            this.deactivate();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlurControl;
}