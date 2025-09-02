/**
 * Aether API Client for Motion Clone Dashboard
 * Handles communication with the Aether Framework backend server
 * 
 * FIXED: Added robust timeout handling, session persistence, and chat support
 */

const AETHER_BASE_URL = 'http://localhost:8000';
const REQUEST_TIMEOUT = 30000; // 30 seconds default timeout
const CHAT_TIMEOUT = 90000; // 90 seconds for chat requests

class AetherClient {
    constructor() {
        this.baseUrl = AETHER_BASE_URL;
        this.retryCount = 3;
        this.retryDelay = 1000;
        // Persistent session ID - generated once and reused
        this.sessionId = this.getOrCreateSessionId();
        this.isRequestInProgress = false;
        console.log(`🔐 Session initialized: ${this.sessionId}`);
    }

    /**
     * Get or create a persistent session ID
     */
    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('aether_session_id');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            localStorage.setItem('aether_session_id', sessionId);
            console.log('🆕 New session created:', sessionId);
        } else {
            console.log('♻️ Existing session restored:', sessionId);
        }
        return sessionId;
    }

    /**
     * Clear session (for manual reset if needed)
     */
    clearSession() {
        localStorage.removeItem('aether_session_id');
        this.sessionId = this.getOrCreateSessionId();
        console.log('🔄 Session reset:', this.sessionId);
    }

    /**
     * Create an abort controller with timeout
     */
    createAbortController(timeout = REQUEST_TIMEOUT) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            console.warn(`⏱️ Request timeout after ${timeout}ms`);
        }, timeout);
        return { controller, timeoutId };
    }

    /**
     * Perform HTTP request with error handling, timeouts, and retries
     */
    async request(endpoint, options = {}, customTimeout = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const timeout = customTimeout || REQUEST_TIMEOUT;
        
        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            const { controller, timeoutId } = this.createAbortController(timeout);
            
            try {
                console.log(`🔗 [Attempt ${attempt}/${this.retryCount}] Requesting: ${url}`);
                console.log(`⏱️ Timeout set to ${timeout}ms`);
                
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });

                // Clear timeout on successful response
                clearTimeout(timeoutId);

                console.log(`📡 Response status: ${response.status} ${response.statusText}`);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log(`✅ API Success:`, data);
                return data;
            } catch (error) {
                clearTimeout(timeoutId);
                
                // Handle timeout specifically
                if (error.name === 'AbortError') {
                    console.error(`⏱️ [Attempt ${attempt}] Request timed out after ${timeout}ms`);
                    error.message = `Request timed out after ${timeout/1000} seconds`;
                } else {
                    console.error(`❌ [Attempt ${attempt}] API Error:`, error.message);
                }
                
                if (attempt === this.retryCount) {
                    // Throw user-friendly error
                    if (error.name === 'AbortError') {
                        throw new Error(`The AI is taking too long to respond. Please try again.`);
                    }
                    throw new Error(`Connection failed: ${error.message}`);
                }
                
                console.log(`⏳ Waiting ${this.retryDelay * attempt}ms before retry...`);
                await this.delay(this.retryDelay * attempt);
            }
        }
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get Aether system health and status
     */
    async getHealth() {
        return await this.request('/health');
    }

    /**
     * Get all configured edicts/agents
     */
    async getEdicts() {
        return await this.request('/edicts');
    }

    /**
     * Get system statistics
     */
    async getStats() {
        return await this.request('/stats');
    }

    /**
     * Execute a webhook edict
     */
    async executeEdict(edictName, context = {}) {
        return await this.request(`/webhook/${edictName}`, {
            method: 'POST',
            body: JSON.stringify(context)
        });
    }

    /**
     * Get cron job schedule
     */
    async getCronJobs() {
        return await this.request('/cron/jobs');
    }

    /**
     * Get consciousness status (Two-Brains integration)
     */
    async getConsciousness() {
        return await this.request('/consciousness/status');
    }

    /**
     * Send query to consciousness for reasoning
     */
    async queryConsciousness(query, context = {}) {
        return await this.request('/consciousness/query', {
            method: 'POST',
            body: JSON.stringify({ query, context })
        });
    }

    /**
     * Get recent execution logs
     */
    async getLogs(limit = 50) {
        return await this.request(`/logs?limit=${limit}`);
    }

    /**
     * Get Wekan integration status (legacy endpoint)
     */
    async getWekanStatus() {
        return await this.request('/wekan/status');
    }

    /**
     * Get Foundry OS project cards
     */
    async getFoundryCards() {
        return await this.request('/foundry/cards');
    }

    /**
     * Get Foundry OS system statistics
     */
    async getFoundryStats() {
        return await this.request('/foundry/stats');
    }

    /**
     * Get generated analytics reports
     */
    async getFoundryReports() {
        return await this.request('/foundry/reports');
    }

    /**
     * Send chat message to AI with proper session handling
     * CRITICAL FIX: Ensures session persistence and timeout handling
     */
    async sendChatMessage(message, onStreamUpdate = null) {
        // Prevent concurrent requests
        if (this.isRequestInProgress) {
            throw new Error('Another request is already in progress. Please wait.');
        }
        
        this.isRequestInProgress = true;
        
        try {
            console.log(`💬 Sending chat message with session: ${this.sessionId}`);
            
            const requestBody = {
                message: message,
                session_id: this.sessionId,  // CRITICAL: Always include session ID
                timestamp: new Date().toISOString()
            };
            
            console.log('📤 Chat request:', requestBody);
            
            // Use longer timeout for chat requests
            const response = await this.request('/api/chat', {
                method: 'POST',
                body: JSON.stringify(requestBody)
            }, CHAT_TIMEOUT);
            
            console.log('📥 Chat response received:', response);
            
            // Handle streaming updates if callback provided
            if (onStreamUpdate && response.response) {
                onStreamUpdate(response.response);
            }
            
            return {
                success: true,
                response: response.response || response.message || 'No response',
                sessionId: this.sessionId,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Chat error:', error);
            
            // Return error in a structured format
            return {
                success: false,
                error: error.message,
                sessionId: this.sessionId,
                timestamp: new Date().toISOString()
            };
        } finally {
            this.isRequestInProgress = false;
        }
    }

    /**
     * Get chat history for current session
     */
    async getChatHistory() {
        try {
            return await this.request(`/api/chat/history/${this.sessionId}`);
        } catch (error) {
            console.error('Failed to get chat history:', error);
            return { messages: [] };
        }
    }

    /**
     * Test connection to Aether server
     */
    async testConnection() {
        try {
            const health = await this.getHealth();
            return { 
                connected: true, 
                status: health.status,
                version: health.aether_version,
                sessionId: this.sessionId 
            };
        } catch (error) {
            return { 
                connected: false, 
                error: error.message,
                sessionId: this.sessionId 
            };
        }
    }

    /**
     * Check if a request is currently in progress
     */
    isRequestPending() {
        return this.isRequestInProgress;
    }
}

// Make globally available
window.AetherClient = AetherClient;

// Create default instance
window.aetherClient = new AetherClient();

console.log('🔗 Aether Client loaded - Ready to connect to consciousness');
console.log(`📍 Session ID: ${window.aetherClient.sessionId}`);