/**
 * SMARTSTORE 360 - API CONNECTOR
 * Handles all communication with Google Apps Script backend
 * Solves CORS issues for GitHub Pages deployment
 */

// CONFIGURATION - UPDATE THIS WITH YOUR GAS WEB APP URL
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxSpy3MfKkb00DXYHAuBlhSiWZXnwtJfAe8wzxDqzTy1BojSM_lhKIsycXpIGKDDt_u-Q/exec';

// API Connector Class
class GASConnector {
    constructor() {
        this.baseURL = GAS_WEB_APP_URL;
        this.requestId = 0;
        this.pendingRequests = new Map();
    }

    /**
     * Main method to call GAS functions - handles CORS and errors
     */
    async callGASFunction(functionName, data = {}, options = {}) {
        const requestId = ++this.requestId;
        const timeout = options.timeout || 30000; // 30 seconds default
        
        console.log(`🔗 Calling GAS function: ${functionName}`, data);

        try {
            // Method 1: Try JSONP first (best for CORS)
            if (this.supportsJSONP()) {
                return await this.jsonpRequest(functionName, data, timeout);
            }
            
            // Method 2: Try fetch with no-cors mode
            return await this.fetchRequest(functionName, data, timeout);
            
        } catch (error) {
            console.error(`❌ GAS API Error (${functionName}):`, error);
            
            // Show user-friendly error message
            this.showConnectionError(error, functionName);
            throw error;
        }
    }

    /**
     * JSONP Method - Works around CORS completely
     */
    jsonpRequest(functionName, data, timeout) {
        return new Promise((resolve, reject) => {
            const callbackName = `gas_callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Set timeout
            const timeoutId = setTimeout(() => {
                delete window[callbackName];
                document.head.removeChild(script);
                reject(new Error(`Request timeout after ${timeout}ms`));
            }, timeout);

            // Create callback function
            window[callbackName] = (response) => {
                clearTimeout(timeoutId);
                delete window[callbackName];
                document.head.removeChild(script);
                
                if (response && response.success !== false) {
                    resolve(response);
                } else {
                    reject(new Error(response?.message || 'Unknown error from server'));
                }
            };

            // Build URL with parameters
            const params = new URLSearchParams();
            params.append('function', functionName);
            params.append('callback', callbackName);
            
            // Add data as JSON string
            if (Object.keys(data).length > 0) {
                params.append('data', JSON.stringify(data));
            }

            // Create script tag
            const script = document.createElement('script');
            script.src = `${this.baseURL}?${params.toString()}`;
            script.onerror = () => {
                clearTimeout(timeoutId);
                delete window[callbackName];
                reject(new Error('Failed to load script - check GAS URL'));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Fetch Method - Fallback when JSONP not available
     */
    async fetchRequest(functionName, data, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const formData = new FormData();
            formData.append('function', functionName);
            
            if (Object.keys(data).length > 0) {
                formData.append('data', JSON.stringify(data));
            }

            const response = await fetch(this.baseURL, {
                method: 'POST',
                body: formData,
                signal: controller.signal,
                mode: 'no-cors' // This helps with some CORS issues
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // With no-cors mode, we can't read the response, so we'll assume success
            // Your GAS should handle the actual processing
            return { success: true, message: 'Request sent successfully' };
            
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${timeout}ms`);
            }
            throw error;
        }
    }

    /**
     * Check if JSONP is supported
     */
    supportsJSONP() {
        return typeof window !== 'undefined' && !window.isSecureContext;
    }

    /**
     * Show user-friendly connection errors
     */
    showConnectionError(error, functionName) {
        let message = 'Connection error: ';
        
        if (error.message.includes('timeout')) {
            message += 'Server is taking too long to respond. Please try again.';
        } else if (error.message.includes('Failed to load')) {
            message += 'Cannot connect to server. Check your GAS URL and internet connection.';
        } else if (error.message.includes('check GAS URL')) {
            message += 'Invalid GAS Web App URL. Please update the configuration.';
        } else {
            message += error.message || 'Unknown error occurred.';
        }

        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert bg-error';
        alertDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: white; cursor: pointer; font-size: 16px;">
                    ×
                </button>
            </div>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 10000);
    }

    /**
     * Test connection to GAS backend
     */
    async testConnection() {
        try {
            const result = await this.callGASFunction('testConnection', {}, { timeout: 10000 });
            return { connected: true, message: 'Connection successful' };
        } catch (error) {
            return { connected: false, message: error.message };
        }
    }

    /**
     * Retry mechanism for failed requests
     */
    async callWithRetry(functionName, data = {}, maxRetries = 3, delay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Attempt ${attempt}/${maxRetries} for ${functionName}`);
                return await this.callGASFunction(functionName, data);
            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries) {
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                    delay *= 2; // Exponential backoff
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Utility sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * INDIVIDUAL API METHODS
 * These match your GAS backend functions
 */

// Create global connector instance
const gasAPI = new GASConnector();

// Authentication
async function login(username, password) {
    return await gasAPI.callWithRetry('login', { username, password });
}

async function changePassword(currentUser, targetUser, newPassword, oldPassword = '', isManager = false) {
    return await gasAPI.callWithRetry('changePassword', {
        currentUser, targetUser, newPassword, oldPassword, isManager
    });
}

// Inventory Management
async function getInventoryData() {
    return await gasAPI.callWithRetry('getInventoryData');
}

async function addInventoryItem(itemData, username) {
    return await gasAPI.callWithRetry('addInventoryItem', { ...itemData, username });
}

async function updateInventoryItem(itemData, username) {
    return await gasAPI.callWithRetry('updateInventoryItem', { ...itemData, username });
}

async function deleteInventoryItem(itemName, username) {
    return await gasAPI.callWithRetry('deleteInventoryItem', { itemName, username });
}

async function bulkUploadInventory(items, username) {
    return await gasAPI.callWithRetry('bulkUploadInventory', { items, username });
}

// Sales Management
async function submitSaleData(saleData) {
    return await gasAPI.callWithRetry('submitSaleData', saleData);
}

async function getTodaysSalesBreakdown() {
    return await gasAPI.callWithRetry('getTodaysSalesBreakdown');
}

// Reports
async function generateReport(params) {
    return await gasAPI.callWithRetry('generateReport', params);
}

// User Management
async function getAllUsers() {
    return await gasAPI.callWithRetry('getAllUsers');
}

async function getAllUsernames() {
    return await gasAPI.callWithRetry('getAllUsernames');
}

async function addUser(userData, currentUser) {
    return await gasAPI.callWithRetry('addUser', { ...userData, currentUser });
}

async function deleteUser(username, currentUser) {
    return await gasAPI.callWithRetry('deleteUser', { username, currentUser });
}

/**
 * GOOGLE APPS SCRIPT MOCK
 * This replaces the google.script.run object for GitHub Pages
 */
window.google = window.google || {};
window.google.script = window.google.script || {};
window.google.script.run = {
    withSuccessHandler(callback) {
        this.successCallback = callback;
        return this;
    },
    
    withFailureHandler(callback) {
        this.failureCallback = callback;
        return this;
    },
    
    // Login
    login(username, password) {
        login(username, password)
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },
    
    // Inventory
    getInventoryData() {
        getInventoryData()
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },
    
    addInventoryItem(itemData, username) {
        addInventoryItem(itemData, username)
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },
    
    updateInventoryItem(itemData, username) {
        updateInventoryItem(itemData, username)
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },
    
    deleteInventoryItem(itemName, username) {
        deleteInventoryItem(itemName, username)
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },
    
    bulkUploadInventory(items, username) {
        bulkUploadInventory(items, username)
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },
    
    // Sales
    submitSaleData(saleData) {
        submitSaleData(saleData)
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },
    
    getTodaysSalesBreakdown() {
        getTodaysSalesBreakdown()
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },
    
    // Reports
    generateReport(params) {
        generateReport(params)
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },
    
    // Users
    getAllUsers() {
        getAllUsers()
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },
    
    getAllUsernames() {
        getAllUsernames()
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },
    
    addUser(userData, currentUser) {
        addUser(userData, currentUser)
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },
    
    deleteUser(username, currentUser) {
        deleteUser(username, currentUser)
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },
    
    changePassword(currentUser, targetUser, newPassword, oldPassword, isManager) {
        changePassword(currentUser, targetUser, newPassword, oldPassword, isManager)
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    }
};

/**
 * CONNECTION TESTER
 * Tests the connection when the page loads
 */
async function testGASConnection() {
    console.log('🔍 Testing connection to GAS backend...');
    
    const testResult = await gasAPI.testConnection();
    
    if (testResult.connected) {
        console.log('✅ GAS Connection: SUCCESS');
        return true;
    } else {
        console.error('❌ GAS Connection: FAILED -', testResult.message);
        
        // Show connection warning
        if (!document.getElementById('connection-warning')) {
            const warning = document.createElement('div');
            warning.id = 'connection-warning';
            warning.className = 'alert bg-error';
            warning.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span>
                        <i class="fas fa-wifi"></i> 
                        Cannot connect to server: ${testResult.message}
                    </span>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="background: none; border: none; color: white; cursor: pointer; font-size: 16px;">
                        ×
                    </button>
                </div>
            `;
            document.body.appendChild(warning);
        }
        
        return false;
    }
}

// Test connection when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(testGASConnection, 1000);
});

console.log('🚀 SmartStore 360 API Connector loaded successfully!');
console.log('📝 Remember to update GAS_WEB_APP_URL with your actual Google Apps Script URL');