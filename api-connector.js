/**
 * SmartStore 360 - GAS API Connector
 * Complete connection handler for Google Apps Script backend
 */

class GASConnector {
    constructor() {
        this.baseUrl = 'https://script.google.com/macros/s/AKfycbzHuHzK0H0OI0LrwAYY7taRKBw5d7Q76Vzr0v7FY37RwssszhkeCYMYRRfijMci5iym9Q/exec';
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Initialize connection
        this.init();
    }

    init() {
        console.log('🔌 GAS Connector Initializing...');
        this.setupErrorHandling();
    }

    setupErrorHandling() {
        window.addEventListener('online', () => {
            console.log('🌐 Internet connection restored');
            this.testConnection();
        });

        window.addEventListener('offline', () => {
            console.warn('⚠️ Internet connection lost');
            this.isConnected = false;
        });
    }

    /**
     * Test connection to GAS backend
     */
    async testConnection() {
        console.log('🔍 Testing GAS connection...');
        
        try {
            const url = `${this.baseUrl}?action=test&timestamp=${Date.now()}`;
            console.log('🔗 Calling GAS URL:', url);

            const response = await this.makeRequest(url);
            
            this.isConnected = true;
            this.retryCount = 0;
            
            console.log('✅ GAS Connection successful:', response);
            this.onConnectionSuccess(response);
            
            return response;
            
        } catch (error) {
            this.isConnected = false;
            this.retryCount++;
            
            console.error('❌ GAS Connection failed:', error);
            this.onConnectionError(error);
            
            // Auto-retry with exponential backoff
            if (this.retryCount <= this.maxRetries) {
                const delay = Math.pow(2, this.retryCount) * 1000;
                console.log(`🔄 Retrying in ${delay}ms... (Attempt ${this.retryCount})`);
                
                setTimeout(() => this.testConnection(), delay);
            }
            
            throw error;
        }
    }

    /**
     * Generic request handler
     */
    async makeRequest(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            timeout: 10000
        };

        const mergedOptions = { ...defaultOptions, ...options };
        
        // Add timestamp to avoid caching
        const finalUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), mergedOptions.timeout);
        mergedOptions.signal = controller.signal;

        try {
            const response = await fetch(finalUrl, mergedOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const text = await response.text();
            
            // Try to parse as JSON, fallback to text
            try {
                return JSON.parse(text);
            } catch {
                return text;
            }
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - GAS backend not responding');
            }
            
            throw error;
        }
    }

    /**
     * PRODUCT MANAGEMENT
     */
    async getProducts(category = 'all') {
        try {
            const url = `${this.baseUrl}?action=getProducts&category=${encodeURIComponent(category)}`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('❌ Failed to fetch products:', error);
            throw error;
        }
    }

    async addProduct(productData) {
        try {
            const url = `${this.baseUrl}?action=addProduct`;
            return await this.makeRequest(url, {
                method: 'POST',
                body: JSON.stringify(productData)
            });
        } catch (error) {
            console.error('❌ Failed to add product:', error);
            throw error;
        }
    }

    async updateProduct(productId, productData) {
        try {
            const url = `${this.baseUrl}?action=updateProduct&id=${encodeURIComponent(productId)}`;
            return await this.makeRequest(url, {
                method: 'POST',
                body: JSON.stringify(productData)
            });
        } catch (error) {
            console.error('❌ Failed to update product:', error);
            throw error;
        }
    }

    async deleteProduct(productId) {
        try {
            const url = `${this.baseUrl}?action=deleteProduct&id=${encodeURIComponent(productId)}`;
            return await this.makeRequest(url, {
                method: 'POST'
            });
        } catch (error) {
            console.error('❌ Failed to delete product:', error);
            throw error;
        }
    }

    /**
     * ORDER MANAGEMENT
     */
    async getOrders(status = 'all') {
        try {
            const url = `${this.baseUrl}?action=getOrders&status=${encodeURIComponent(status)}`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('❌ Failed to fetch orders:', error);
            throw error;
        }
    }

    async createOrder(orderData) {
        try {
            const url = `${this.baseUrl}?action=createOrder`;
            return await this.makeRequest(url, {
                method: 'POST',
                body: JSON.stringify(orderData)
            });
        } catch (error) {
            console.error('❌ Failed to create order:', error);
            throw error;
        }
    }

    async updateOrderStatus(orderId, status) {
        try {
            const url = `${this.baseUrl}?action=updateOrderStatus&id=${encodeURIComponent(orderId)}&status=${encodeURIComponent(status)}`;
            return await this.makeRequest(url, {
                method: 'POST'
            });
        } catch (error) {
            console.error('❌ Failed to update order status:', error);
            throw error;
        }
    }

    /**
     * INVENTORY MANAGEMENT
     */
    async getInventory() {
        try {
            const url = `${this.baseUrl}?action=getInventory`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('❌ Failed to fetch inventory:', error);
            throw error;
        }
    }

    async updateStock(productId, newQuantity) {
        try {
            const url = `${this.baseUrl}?action=updateStock&id=${encodeURIComponent(productId)}&quantity=${newQuantity}`;
            return await this.makeRequest(url, {
                method: 'POST'
            });
        } catch (error) {
            console.error('❌ Failed to update stock:', error);
            throw error;
        }
    }

    /**
     * ANALYTICS & REPORTS
     */
    async getSalesReport(startDate, endDate) {
        try {
            const url = `${this.baseUrl}?action=getSalesReport&start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('❌ Failed to fetch sales report:', error);
            throw error;
        }
    }

    async getDashboardData() {
        try {
            const url = `${this.baseUrl}?action=getDashboardData`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('❌ Failed to fetch dashboard data:', error);
            throw error;
        }
    }

    /**
     * Event handlers
     */
    onConnectionSuccess(response) {
        // Dispatch custom event for other components to listen to
        const event = new CustomEvent('gas-connected', { 
            detail: { response, timestamp: new Date() }
        });
        window.dispatchEvent(event);
        
        // Update UI state if needed
        if (window.updateConnectionStatus) {
            window.updateConnectionStatus(true);
        }
    }

    onConnectionError(error) {
        // Dispatch custom event for connection errors
        const event = new CustomEvent('gas-error', { 
            detail: { error, timestamp: new Date() }
        });
        window.dispatchEvent(event);
        
        // Update UI state if needed
        if (window.updateConnectionStatus) {
            window.updateConnectionStatus(false);
        }
    }

    /**
     * Utility methods
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            retryCount: this.retryCount,
            baseUrl: this.baseUrl
        };
    }

    resetConnection() {
        this.retryCount = 0;
        this.isConnected = false;
        return this.testConnection();
    }
}

// Create global instance
const gasAPI = new GASConnector();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GASConnector, gasAPI };
}