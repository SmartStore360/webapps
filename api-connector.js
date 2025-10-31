/**
 * SmartStore 360 - GAS API Connector
 * Fixed Version - Using Fetch API Only
 */

class GASConnector {
    constructor() {
        // USE YOUR ACTUAL SCRIPT ID - Replace this!
        this.baseUrl = 'https://script.google.com/macros/s/AKfycbzHuHzK0H0OI0LrwAYY7taRKBw5d7Q76Vzr0v7FY37RwssszhkeCYMYRRfijMci5iym9Q/exec';
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * Test connection to GAS backend - FIXED VERSION
     */
    async testConnection() {
        console.log('🔍 Testing GAS connection...');
        
        try {
            const url = `${this.baseUrl}?action=test&timestamp=${Date.now()}`;
            console.log('🔗 Calling GAS URL:', url);

            // Use simple fetch without complex options that trigger preflight
            const response = await fetch(url, {
                method: 'GET',
                // Remove 'mode: cors' and let browser handle it
                // Remove custom headers to avoid preflight
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            let data;
            
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = { rawResponse: text };
            }

            this.isConnected = true;
            this.retryCount = 0;
            
            console.log('✅ GAS Connection successful:', data);
            this.onConnectionSuccess(data);
            
            return data;
            
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
     * Simple GET request - No preflight triggers
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `${this.baseUrl}?action=${endpoint}&${queryString}&t=${Date.now()}`;
        
        try {
            const response = await fetch(url);
            const text = await response.text();
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            
            return JSON.parse(text);
        } catch (error) {
            console.error(`❌ GET ${endpoint} failed:`, error);
            throw error;
        }
    }

    /**
     * Simple POST request - Using URL params instead of body to avoid preflight
     */
    async post(endpoint, data = {}) {
        const queryString = new URLSearchParams({
            action: endpoint,
            ...data,
            t: Date.now()
        }).toString();
        
        const url = `${this.baseUrl}?${queryString}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST'
            });
            
            const text = await response.text();
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            
            return JSON.parse(text);
        } catch (error) {
            console.error(`❌ POST ${endpoint} failed:`, error);
            throw error;
        }
    }

    /**
     * PRODUCT MANAGEMENT
     */
    async getProducts(category = 'all') {
        return this.get('getProducts', { category });
    }

    async addProduct(productData) {
        return this.post('addProduct', productData);
    }

    async updateProduct(productId, productData) {
        return this.post('updateProduct', { id: productId, ...productData });
    }

    async deleteProduct(productId) {
        return this.post('deleteProduct', { id: productId });
    }

    /**
     * ORDER MANAGEMENT
     */
    async getOrders(status = 'all') {
        return this.get('getOrders', { status });
    }

    async createOrder(orderData) {
        return this.post('createOrder', orderData);
    }

    async updateOrderStatus(orderId, status) {
        return this.post('updateOrderStatus', { id: orderId, status });
    }

    /**
     * INVENTORY MANAGEMENT
     */
    async getInventory() {
        return this.get('getInventory');
    }

    async updateStock(productId, newQuantity) {
        return this.post('updateStock', { id: productId, quantity: newQuantity });
    }

    /**
     * ANALYTICS & REPORTS
     */
    async getSalesReport(startDate, endDate) {
        return this.get('getSalesReport', { start: startDate, end: endDate });
    }

    async getDashboardData() {
        return this.get('getDashboardData');
    }

    /**
     * Event handlers
     */
    onConnectionSuccess(response) {
        const event = new CustomEvent('gas-connected', { 
            detail: { response, timestamp: new Date() }
        });
        window.dispatchEvent(event);
        
        if (window.updateConnectionStatus) {
            window.updateConnectionStatus(true);
        }
    }

    onConnectionError(error) {
        const event = new CustomEvent('gas-error', { 
            detail: { error, timestamp: new Date() }
        });
        window.dispatchEvent(event);
        
        if (window.updateConnectionStatus) {
            window.updateConnectionStatus(false);
        }
    }

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