/**
 * SMARTSTORE 360 - API CONNECTOR
 * Simple working version
 */

// ⚠️ REPLACE THIS WITH YOUR NEW GAS URL AFTER DEPLOYMENT ⚠️
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxEPqPsH_DeH4KflEwHHStbjD4Bj5HnJQpsfkR67QvapG__zlzTYdX1q_FQpZdjggpMcA/exec';

class GASConnector {
    constructor() {
        this.baseURL = GAS_WEB_APP_URL;
    }

    async callGASFunction(functionName, data = {}) {
        return new Promise((resolve, reject) => {
            const callbackName = `callback_${Date.now()}`;
            const timeoutId = setTimeout(() => {
                this.cleanup(callbackName, script);
                reject(new Error('Timeout: Server took too long to respond'));
            }, 15000);

            window[callbackName] = (response) => {
                clearTimeout(timeoutId);
                this.cleanup(callbackName, script);
                resolve(response);
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
                this.cleanup(callbackName, script);
                reject(new Error(`Cannot connect to: ${this.baseURL}. Please check:\n1. GAS is deployed as "Anyone"\n2. GAS has doPost() function\n3. Your internet connection`));
            };

            document.head.appendChild(script);
        });
    }

    cleanup(callbackName, script) {
        try {
            delete window[callbackName];
            if (script && script.parentElement) {
                script.parentElement.removeChild(script);
            }
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

// Create global instance
const gasAPI = new GASConnector();

// Simple google.script.run mock
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
    
    testConnection() {
        gasAPI.callGASFunction('testConnection', {})
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    login(username, password) {
        gasAPI.callGASFunction('login', { username, password })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    getInventoryData() {
        gasAPI.callGASFunction('getInventoryData', {})
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    submitSaleData(saleData) {
        gasAPI.callGASFunction('submitSaleData', saleData)
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    generateReport(params) {
        gasAPI.callGASFunction('generateReport', params)
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    addInventoryItem(itemData, username) {
        gasAPI.callGASFunction('addInventoryItem', { ...itemData, username })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    updateInventoryItem(itemData, username) {
        gasAPI.callGASFunction('updateInventoryItem', { ...itemData, username })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    deleteInventoryItem(itemName, username) {
        gasAPI.callGASFunction('deleteInventoryItem', { itemName, username })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    bulkUploadInventory(items, username) {
        gasAPI.callGASFunction('bulkUploadInventory', { items, username })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    getTodaysSalesBreakdown() {
        gasAPI.callGASFunction('getTodaysSalesBreakdown', {})
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    getAllUsers() {
        gasAPI.callGASFunction('getAllUsers', {})
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    getAllUsernames() {
        gasAPI.callGASFunction('getAllUsernames', {})
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    addUser(userData, currentUser) {
        gasAPI.callGASFunction('addUser', { ...userData, currentUser })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    deleteUser(username, currentUser) {
        gasAPI.callGASFunction('deleteUser', { username, currentUser })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    changePassword(currentUser, targetUser, newPassword, oldPassword, isManager) {
        gasAPI.callGASFunction('changePassword', { currentUser, targetUser, newPassword, oldPassword, isManager })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    }
};

// Test connection with better error display
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        const statusDiv = document.createElement('div');
        statusDiv.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: #3b82f6;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            text-align: center;
            max-width: 500px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        statusDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="spinner"></div>
                <div>Testing connection to Google Apps Script...</div>
            </div>
            <style>
                .spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid #ffffff;
                    border-top: 2px solid transparent;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        document.body.appendChild(statusDiv);

        try {
            console.log('🔍 Testing GAS connection to:', GAS_WEB_APP_URL);
            const result = await gasAPI.callGASFunction('testConnection', {});
            
            statusDiv.style.background = '#10b981';
            statusDiv.innerHTML = `
                ✅ <strong>Connected Successfully!</strong>
                <br><small>Google Apps Script is now connected</small>
            `;
            console.log('✅ GAS Connection successful:', result);
            
            setTimeout(() => statusDiv.remove(), 5000);
        } catch (error) {
            statusDiv.style.background = '#ef4444';
            statusDiv.innerHTML = `
                ❌ <strong>Connection Failed</strong>
                <br><small>${error.message}</small>
                <br><small style="font-size: 12px; opacity: 0.8;">
                    Please check your GAS deployment settings
                </small>
            `;
            console.error('❌ GAS Connection failed:', error);
        }
    }, 1000);
});

console.log('🚀 SmartStore 360 API Connector Loaded');