/**
 * SMARTSTORE 360 - API CONNECTOR
 * Using your actual GAS URL
 */

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxSpy3MfKkb00DXYHAuBlhSiWZXnwtJfAe8wzxDqzTy1BojSM_lhKIsycXpIGKDDt_u-Q/exec';

class GASConnector {
    constructor() {
        this.baseURL = GAS_WEB_APP_URL;
    }

    async callGASFunction(functionName, data = {}) {
        return new Promise((resolve, reject) => {
            const callbackName = `gas_callback_${Date.now()}`;
            const timeoutId = setTimeout(() => {
                this.cleanupJSONP(callbackName, script);
                reject(new Error('Request timeout after 30 seconds'));
            }, 30000);

            window[callbackName] = (response) => {
                clearTimeout(timeoutId);
                this.cleanupJSONP(callbackName, script);
                
                if (response && response.success !== false) {
                    resolve(response);
                } else {
                    reject(new Error(response?.message || 'Server returned an error'));
                }
            };

            const params = new URLSearchParams();
            params.append('function', functionName);
            params.append('callback', callbackName);
            
            if (Object.keys(data).length > 0) {
                params.append('data', JSON.stringify(data));
            }

            const script = document.createElement('script');
            script.src = `${this.baseURL}?${params.toString()}`;
            script.onerror = () => {
                clearTimeout(timeoutId);
                this.cleanupJSONP(callbackName, script);
                reject(new Error(`Failed to load script. Check GAS deployment settings.`));
            };

            document.head.appendChild(script);
        });
    }

    cleanupJSONP(callbackName, script) {
        try {
            delete window[callbackName];
            if (script && script.parentElement) {
                script.parentElement.removeChild(script);
            }
        } catch (error) {
            console.warn('Cleanup error:', error);
        }
    }

    async callWithRetry(functionName, data = {}, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Attempt ${attempt}/${maxRetries} for ${functionName}`);
                return await this.callGASFunction(functionName, data);
            } catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }
        throw lastError;
    }
}

// Create global instance
const gasAPI = new GASConnector();

// Mock google.script.run for compatibility
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
    
    // Authentication
    login(username, password) {
        gasAPI.callWithRetry('login', { username, password })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    changePassword(currentUser, targetUser, newPassword, oldPassword, isManager) {
        gasAPI.callWithRetry('changePassword', { currentUser, targetUser, newPassword, oldPassword, isManager })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    // Inventory
    getInventoryData() {
        gasAPI.callWithRetry('getInventoryData')
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    addInventoryItem(itemData, username) {
        gasAPI.callWithRetry('addInventoryItem', { ...itemData, username })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    updateInventoryItem(itemData, username) {
        gasAPI.callWithRetry('updateInventoryItem', { ...itemData, username })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    deleteInventoryItem(itemName, username) {
        gasAPI.callWithRetry('deleteInventoryItem', { itemName, username })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    bulkUploadInventory(items, username) {
        gasAPI.callWithRetry('bulkUploadInventory', { items, username })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    // Sales
    submitSaleData(saleData) {
        gasAPI.callWithRetry('submitSaleData', saleData)
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    getTodaysSalesBreakdown() {
        gasAPI.callWithRetry('getTodaysSalesBreakdown')
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    // Reports
    generateReport(params) {
        gasAPI.callWithRetry('generateReport', params)
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    // Users
    getAllUsers() {
        gasAPI.callWithRetry('getAllUsers')
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    getAllUsernames() {
        gasAPI.callWithRetry('getAllUsernames')
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    addUser(userData, currentUser) {
        gasAPI.callWithRetry('addUser', { ...userData, currentUser })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    deleteUser(username, currentUser) {
        gasAPI.callWithRetry('deleteUser', { username, currentUser })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    }
};

// Test connection
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        try {
            console.log('🔍 Testing GAS connection...');
            const result = await gasAPI.callGASFunction('testConnection', {});
            console.log('✅ GAS Connection successful:', result);
        } catch (error) {
            console.error('❌ GAS Connection failed:', error.message);
            
            // Show helpful error message
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: #ef4444;
                color: white;
                padding: 15px;
                border-radius: 5px;
                z-index: 10000;
                max-width: 500px;
                text-align: center;
                font-family: Arial, sans-serif;
            `;
            errorDiv.innerHTML = `
                <strong>Connection Error:</strong> ${error.message}
                <br><small>Please check your GAS deployment settings</small>
            `;
            document.body.appendChild(errorDiv);
        }
    }, 1000);
});

console.log('🚀 SmartStore 360 API Connector Loaded with your GAS URL');