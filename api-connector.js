/**
 * SmartStore 360 - GAS API Connector
 * JSONP Version - Bypasses CORS completely
 */

class GASConnector {
    constructor() {
        this.baseUrl = 'https://script.google.com/macros/s/AKfycbzHuHzK0H0OI0LrwAYY7taRKBw5d7Q76Vzr0v7FY37RwssszhkeCYMYRRfijMci5iym9Q/exec';
        this.isConnected = false;
        this.callbacks = new Map();
        this.callbackId = 0;
    }

    /**
     * JSONP Request - Bypasses CORS
     */
    jsonpRequest(params) {
        return new Promise((resolve, reject) => {
            const callbackName = 'gas_callback_' + this.callbackId++;
            
            this.callbacks.set(callbackName, { resolve, reject });
            
            // Add callback to window
            window[callbackName] = (response) => {
                this.cleanupJsonp(callbackName);
                resolve(response);
            };
            
            // Create script tag
            const script = document.createElement('script');
            const urlParams = new URLSearchParams({
                ...params,
                callback: callbackName
            });
            
            script.src = `${this.baseUrl}?${urlParams.toString()}`;
            script.onerror = () => {
                this.cleanupJsonp(callbackName);
                reject(new Error('JSONP request failed'));
            };
            
            document.head.appendChild(script);
        });
    }

    cleanupJsonp(callbackName) {
        delete window[callbackName];
        this.callbacks.delete(callbackName);
        
        // Remove any script tags we created
        const scripts = document.head.getElementsByTagName('script');
        for (let script of scripts) {
            if (script.src.includes('callback=' + callbackName)) {
                document.head.removeChild(script);
                break;
            }
        }
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
            this.onConnectionSuccess(response);
            
            return response;
            
        } catch (error) {
            this.isConnected = false;
            console.error('❌ GAS Connection failed:', error);
            this.onConnectionError(error);
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
        // For POST-like actions with JSONP, we send data as URL parameters
        const params = { action: 'addProduct', ...productData };
        return this.jsonpRequest(params);
    }

    async updateProduct(productId, productData) {
        const params = { 
            action: 'updateProduct', 
            id: productId,
            ...productData 
        };
        return this.jsonpRequest(params);
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
        const params = { action: 'createOrder', ...orderData };
        return this.jsonpRequest(params);
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
     * Event handlers
     */
    onConnectionSuccess(response) {
        const event = new CustomEvent('gas-connected', { 
            detail: { response, timestamp: new Date() }
        });
        window.dispatchEvent(event);
    }

    onConnectionError(error) {
        const event = new CustomEvent('gas-error', { 
            detail: { error, timestamp: new Date() }
        });
        window.dispatchEvent(event);
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            baseUrl: this.baseUrl
        };
    }
}

// Create global instance
const gasAPI = new GASConnector();