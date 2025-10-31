/**
 * SmartStore 360 - GAS API Connector
 * JSONP Version - WORKING SOLUTION
 */

class GASConnector {
    constructor() {
        this.baseUrl = 'https://script.google.com/macros/s/AKfycbzHuHzK0H0OI0LrwAYY7taRKBw5d7Q76Vzr0v7FY37RwssszhkeCYMYRRfijMci5iym9Q/exec';
        this.isConnected = false;
        this.callbacks = new Map();
        this.callbackId = 0;
        
        console.log('🔌 GAS Connector Initialized with JSONP');
    }

    /**
     * JSONP Request - Bypasses CORS completely
     */
    jsonpRequest(params = {}) {
        return new Promise((resolve, reject) => {
            const callbackName = 'gas_jsonp_' + Date.now() + '_' + this.callbackId++;
            
            // Store the callback
            this.callbacks.set(callbackName, { resolve, reject });
            
            // Create global callback function
            window[callbackName] = (response) => {
                console.log('📨 JSONP Response received:', response);
                this.cleanupJsonp(callbackName);
                resolve(response);
            };
            
            // Build URL with callback parameter
            const urlParams = new URLSearchParams({
                ...params,
                callback: callbackName,
                _: Date.now() // Cache buster
            });
            
            const url = `${this.baseUrl}?${urlParams.toString()}`;
            console.log('🔗 JSONP Calling:', url);
            
            // Create and inject script tag
            const script = document.createElement('script');
            script.src = url;
            script.onerror = (error) => {
                console.error('❌ JSONP Script failed to load:', error);
                this.cleanupJsonp(callbackName);
                reject(new Error('Failed to load GAS script'));
            };
            
            // Set timeout for JSONP request
            const timeoutId = setTimeout(() => {
                this.cleanupJsonp(callbackName);
                reject(new Error('JSONP request timeout'));
            }, 10000);
            
            // Store timeout ID for cleanup
            this.callbacks.get(callbackName).timeoutId = timeoutId;
            
            // Inject script
            document.head.appendChild(script);
        });
    }

    cleanupJsonp(callbackName) {
        // Clear timeout
        const callbackInfo = this.callbacks.get(callbackName);
        if (callbackInfo && callbackInfo.timeoutId) {
            clearTimeout(callbackInfo.timeoutId);
        }
        
        // Remove callback from window
        delete window[callbackName];
        this.callbacks.delete(callbackName);
        
        // Remove script tags (cleanup)
        const scripts = document.querySelectorAll(`script[src*="callback=${callbackName}"]`);
        scripts.forEach(script => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        });
    }

    /**
     * Test connection using JSONP
     */
    async testConnection() {
        console.log('🔍 Testing GAS connection with JSONP...');
        
        try {
            const response = await this.jsonpRequest({ action: 'test' });
            
            this.isConnected = true;
            console.log('✅ GAS Connection successful:', response);
            
            // Dispatch success event
            const event = new CustomEvent('gas-connected', { 
                detail: { response, timestamp: new Date() }
            });
            window.dispatchEvent(event);
            
            return response;
            
        } catch (error) {
            this.isConnected = false;
            console.error('❌ GAS Connection failed:', error);
            
            // Dispatch error event
            const event = new CustomEvent('gas-error', { 
                detail: { error, timestamp: new Date() }
            });
            window.dispatchEvent(event);
            
            throw error;
        }
    }

    /**
     * PRODUCT MANAGEMENT
     */
    async getProducts(category = 'all') {
        return this.jsonpRequest({ action: 'getProducts', category });
    }

    async addProduct(productData) {
        return this.jsonpRequest({ action: 'addProduct', ...productData });
    }

    async updateProduct(productId, productData) {
        return this.jsonpRequest({ 
            action: 'updateProduct', 
            id: productId,
            ...productData 
        });
    }

    async deleteProduct(productId) {
        return this.jsonpRequest({ action: 'deleteProduct', id: productId });
    }

    /**
     * ORDER MANAGEMENT
     */
    async getOrders(status = 'all') {
        return this.jsonpRequest({ action: 'getOrders', status });
    }

    async createOrder(orderData) {
        return this.jsonpRequest({ action: 'createOrder', ...orderData });
    }

    async updateOrderStatus(orderId, status) {
        return this.jsonpRequest({ 
            action: 'updateOrderStatus', 
            id: orderId, 
            status 
        });
    }

    /**
     * INVENTORY MANAGEMENT
     */
    async getInventory() {
        return this.jsonpRequest({ action: 'getInventory' });
    }

    async updateStock(productId, newQuantity) {
        return this.jsonpRequest({ 
            action: 'updateStock', 
            id: productId, 
            quantity: newQuantity 
        });
    }

    /**
     * ANALYTICS & REPORTS
     */
    async getSalesReport(startDate, endDate) {
        return this.jsonpRequest({ 
            action: 'getSalesReport', 
            start: startDate, 
            end: endDate 
        });
    }

    async getDashboardData() {
        return this.jsonpRequest({ action: 'getDashboardData' });
    }

    /**
     * Utility methods
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            baseUrl: this.baseUrl
        };
    }

    resetConnection() {
        this.isConnected = false;
        return this.testConnection();
    }
}

// Create global instance
const gasAPI = new GASConnector();