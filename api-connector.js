/**
 * SmartStore 360 - GAS API Connector
 * JSONP Version - WORKING SOLUTION
 * COPY AND REPLACE YOUR ENTIRE api-connector.js WITH THIS
 */

class GASConnector {
    constructor() {
        this.baseUrl = 'https://script.google.com/macros/s/AKfycbzL2NyV1GfvRqBYeFB0DI-0IjrsRZiULNVRNXShR7k3xTPF4B1WOzFKc15C6VSIRY8Reg/exec';
        this.isConnected = false;
        this.callbacks = new Map();
        this.callbackId = 0;
        
        console.log('🔌 GAS JSONP Connector Initialized');
    }

    /**
     * JSONP Request - Bypasses CORS completely
     */
    jsonpRequest(params = {}) {
        return new Promise((resolve, reject) => {
            const callbackName = 'gas_jsonp_' + Date.now() + '_' + this.callbackId++;
            
            console.log('🔄 JSONP Request with callback:', callbackName);
            
            // Store the callback
            this.callbacks.set(callbackName, { resolve, reject });
            
            // Create global callback function
            window[callbackName] = (response) => {
                console.log('📨 JSONP Response received for', callbackName, response);
                this.cleanupJsonp(callbackName);
                
                if (response && response.status === 'success') {
                    resolve(response);
                } else {
                    reject(new Error(response?.message || 'JSONP response error'));
                }
            };
            
            // Build URL with callback parameter
            const urlParams = new URLSearchParams({
                ...params,
                callback: callbackName,
                _: Date.now() // Cache buster
            });
            
            const url = `${this.baseUrl}?${urlParams.toString()}`;
            console.log('🔗 JSONP Calling URL:', url);
            
            // Create and inject script tag
            const script = document.createElement('script');
            script.src = url;
            
            script.onerror = (error) => {
                console.error('❌ JSONP Script failed to load:', error);
                this.cleanupJsonp(callbackName);
                reject(new Error('Failed to load GAS script - Check if GAS is deployed correctly'));
            };
            
            // Set timeout for JSONP request
            const timeoutId = setTimeout(() => {
                console.error('⏰ JSONP Timeout for callback:', callbackName);
                this.cleanupJsonp(callbackName);
                reject(new Error('JSONP request timeout - GAS not responding'));
            }, 15000);
            
            // Store timeout ID for cleanup
            this.callbacks.get(callbackName).timeoutId = timeoutId;
            
            // Inject script - THIS TRIGGERS THE REQUEST
            console.log('📤 Injecting script tag for JSONP...');
            document.head.appendChild(script);
            
        });
    }

    cleanupJsonp(callbackName) {
        console.log('🧹 Cleaning up JSONP callback:', callbackName);
        
        // Clear timeout
        const callbackInfo = this.callbacks.get(callbackName);
        if (callbackInfo && callbackInfo.timeoutId) {
            clearTimeout(callbackInfo.timeoutId);
        }
        
        // Remove callback from window
        delete window[callbackName];
        this.callbacks.delete(callbackName);
        
        // Remove script tags (cleanup)
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.src.includes('callback=' + callbackName)) {
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                    console.log('🗑️ Removed script tag for:', callbackName);
                }
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


