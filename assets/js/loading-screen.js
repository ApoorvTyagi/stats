/**
 * Loading Screen Module
 * A modular, configurable loading screen with rotating facts and messages
 * 
 * Usage:
 *   1. Include this script in your HTML
 *   2. Add the required HTML structure (see getLoadingHTML())
 *   3. Call LoadingScreen.show() and LoadingScreen.hide()
 * 
 * Customization:
 *   - LoadingScreen.addFact("Your custom fact")
 *   - LoadingScreen.addMessage("Your custom message")
 *   - LoadingScreen.addTip("Your custom tip")
 *   - LoadingScreen.setRotationInterval(5000) // 5 seconds
 */

// ============================================
// Loading Screen Configuration
// ============================================
const LoadingScreenConfig = {
  // Rotation interval in milliseconds
  rotationInterval: 3000,
  
  // Random facts about GitHub, programming, and open source
  facts: [
    "The first Git commit was made by Linus Torvalds on April 7, 2005.",
    "GitHub was launched in 2008 and now hosts over 200 million repositories.",
    "The term 'bug' originated from an actual moth found in a Harvard computer in 1947.",
    "Linus Torvalds created Git in just about 2 weeks.",
    "The average pull request takes about 4 days to get merged.",
    "JavaScript was created in just 10 days by Brendan Eich.",
    "The first computer programmer was Ada Lovelace in the 1840s.",
    "Over 100 million developers use GitHub worldwide.",
    "The most starred repository on GitHub is freeCodeCamp.",
    "Git tracks content, not files - that's why empty folders aren't tracked.",
    "The 'Octocat' mascot was designed by Simon Oxley.",
    "Small PRs (under 200 lines) get reviewed 40% faster than large ones.",
    "The Linux kernel has over 30 million lines of code.",
    "Python was named after Monty Python, not the snake.",
    "The first version control system, SCCS, was created in 1972.",
    "GitHub's 'Octocat' is actually named 'Mona'.",
    "The most common commit message is 'fix typo'.",
    "Open source software powers 90% of the world's supercomputers.",
    "The longest Git commit hash possible is 40 characters.",
    "Stack Overflow has over 50 million questions asked."
  ],
  
  // Loading status messages that rotate
  messages: [
    "Fetching your contributions...",
    "Analyzing merge patterns...",
    "Counting commits...",
    "Crunching the numbers...",
    "Loading PR statistics...",
    "Gathering repository data...",
    "Calculating metrics...",
    "Brewing fresh stats...",
    "Summoning the Octocat...",
    "Parsing your pull requests...",
    "Scanning repositories...",
    "Loading your coding history...",
    "Connecting to GitHub...",
    "Processing data streams..."
  ],
  
  // Tips about GitHub and PRs
  tips: [
    "Tip: Small PRs get reviewed faster and have fewer bugs.",
    "Tip: Use draft PRs to get early feedback on your work.",
    "Tip: Write descriptive commit messages for better history.",
    "Tip: Link issues in your PR description for auto-closing.",
    "Tip: Request reviews from specific team members for faster merges.",
    "Tip: Use GitHub Actions to automate your CI/CD pipeline.",
    "Tip: Squash commits before merging for cleaner history.",
    "Tip: Add labels to PRs for better organization."
  ]
};

// ============================================
// Loading Screen Controller
// ============================================
const LoadingScreen = {
  intervalId: null,
  currentFactIndex: -1,
  currentMessageIndex: -1,
  overlayElement: null,
  
  /**
   * Get a random item from an array (avoiding repeats)
   */
  getRandomItem(array, lastIndex) {
    if (!array || array.length === 0) {
      return { item: '', index: -1 };
    }
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * array.length);
    } while (newIndex === lastIndex && array.length > 1);
    return { item: array[newIndex], index: newIndex };
  },
  
  /**
   * Update the loading screen content
   */
  updateContent() {
    const factElement = document.getElementById('loadingFact');
    const messageElement = document.getElementById('loadingMessage');
    
    if (factElement) {
      const { item: fact, index: factIndex } = this.getRandomItem(
        LoadingScreenConfig.facts, 
        this.currentFactIndex
      );
      this.currentFactIndex = factIndex;
      
      // Fade out, change text, fade in
      factElement.style.opacity = '0';
      setTimeout(() => {
        factElement.textContent = fact;
        factElement.style.opacity = '1';
      }, 300);
    }
    
    if (messageElement) {
      const { item: message, index: msgIndex } = this.getRandomItem(
        LoadingScreenConfig.messages, 
        this.currentMessageIndex
      );
      this.currentMessageIndex = msgIndex;
      
      messageElement.style.opacity = '0';
      setTimeout(() => {
        messageElement.textContent = message;
        messageElement.style.opacity = '1';
      }, 300);
    }
  },
  
  /**
   * Start the loading screen rotation
   */
  start() {
    // Set initial content immediately
    this.updateContent();
    
    // Start rotation interval
    this.intervalId = setInterval(() => {
      this.updateContent();
    }, LoadingScreenConfig.rotationInterval);
  },
  
  /**
   * Stop the loading screen rotation
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentFactIndex = -1;
    this.currentMessageIndex = -1;
  },
  
  /**
   * Show the loading overlay
   */
  show() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.add('active');
      this.start();
    }
  },
  
  /**
   * Hide the loading overlay
   */
  hide() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      this.stop();
    }
  },
  
  /**
   * Add a custom fact to the rotation
   */
  addFact(fact) {
    if (fact && typeof fact === 'string') {
      LoadingScreenConfig.facts.push(fact);
    }
  },
  
  /**
   * Add multiple custom facts
   */
  addFacts(facts) {
    if (Array.isArray(facts)) {
      facts.forEach(fact => this.addFact(fact));
    }
  },
  
  /**
   * Add a custom message to the rotation
   */
  addMessage(message) {
    if (message && typeof message === 'string') {
      LoadingScreenConfig.messages.push(message);
    }
  },
  
  /**
   * Add multiple custom messages
   */
  addMessages(messages) {
    if (Array.isArray(messages)) {
      messages.forEach(msg => this.addMessage(msg));
    }
  },
  
  /**
   * Add a custom tip
   */
  addTip(tip) {
    if (tip && typeof tip === 'string') {
      LoadingScreenConfig.tips.push(tip);
    }
  },
  
  /**
   * Set the rotation interval
   */
  setRotationInterval(ms) {
    if (typeof ms === 'number' && ms > 0) {
      LoadingScreenConfig.rotationInterval = ms;
      // Restart if currently running
      if (this.intervalId) {
        this.stop();
        this.start();
      }
    }
  },
  
  /**
   * Get a random tip (for one-time display)
   */
  getRandomTip() {
    const { item } = this.getRandomItem(LoadingScreenConfig.tips, -1);
    return item;
  },
  
  /**
   * Get a random fact (for one-time display)
   */
  getRandomFact() {
    const { item } = this.getRandomItem(LoadingScreenConfig.facts, -1);
    return item;
  },
  
  /**
   * Get the HTML template for the loading overlay
   * Can be used to dynamically inject the loading screen
   */
  getLoadingHTML() {
    return `
    <div class="loading-overlay" id="loadingOverlay">
      <div class="loading-content">
        <div class="loading-icon">
          <svg class="github-logo" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          <div class="spinner-ring"></div>
        </div>
        <div class="loading-text">
          <span class="loading-message" id="loadingMessage">Loading data from GitHub...</span>
        </div>
        <div class="loading-fact-container">
          <div class="fact-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
          </div>
          <p class="loading-fact" id="loadingFact">Did you know? Loading interesting facts...</p>
        </div>
      </div>
    </div>`;
  }
};

// Export for module systems (if used)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LoadingScreen, LoadingScreenConfig };
}
