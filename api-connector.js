/**
 * SMARTSTORE 360 - API CONNECTOR
 * Final working version
 */

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxEPqPsH_DeH4KflEwHHStbjD4Bj5HnJQpsfkR67QvapG__zlzTYdX1q_FQpZdjggpMcA/exec';

class GASConnector {
    constructor() {
        this.baseURL = GAS_WEB_APP_URL;
    }

    async callGASFunction(functionName, data = {}) {
        console.log(`📞 Calling GAS: ${functionName}`, data);
        
        return new Promise((resolve, reject) => {
            const callbackName = `gas_${Date.now()}`;
            const timeoutId = setTimeout(() => {
                this.cleanupJSONP(callbackName, script);
                reject(new Error('Timeout: Server took too long to respond'));
            }, 30000);

            window[callbackName] = (response) => {
                console.log(`📨 GAS Response:`, response);
                clearTimeout(timeoutId);
                this.cleanupJSONP(callbackName, script);
                
                if (response && response.success !== false) {
                    resolve(response);
                } else {
                    reject(new Error(response?.message || `Function ${functionName} failed`));
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
                reject(new Error(`Cannot connect to Google Apps Script. Please check deployment settings.`));
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
            console.warn('Cleanup warning:', error);
        }
    }

    async callWithRetry(functionName, data = {}, maxRetries = 2) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.callGASFunction(functionName, data);
            } catch (error) {
                console.log(`🔄 Attempt ${attempt} failed:`, error.message);
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
}

// Create global instance
const gasAPI = new GASConnector();

// Mock google.script.run
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
        gasAPI.callGASFunction('testConnection')
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    login(username, password) {
        gasAPI.callWithRetry('login', { username, password })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    getInventoryData() {
        gasAPI.callWithRetry('getInventoryData')
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    submitSaleData(saleData) {
        gasAPI.callWithRetry('submitSaleData', saleData)
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

    generateReport(params) {
        gasAPI.callWithRetry('generateReport', params)
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

    getTodaysSalesBreakdown() {
        gasAPI.callWithRetry('getTodaysSalesBreakdown')
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    },

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
    },

    changePassword(currentUser, targetUser, newPassword, oldPassword, isManager) {
        gasAPI.callWithRetry('changePassword', { currentUser, targetUser, newPassword, oldPassword, isManager })
            .then(this.successCallback)
            .catch(this.failureCallback);
        return this;
    }
};

// Test connection
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        const testDiv = document.createElement('div');
        testDiv.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: #3b82f6;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;
        testDiv.textContent = '🔍 Testing connection to Google Apps Script...';
        document.body.appendChild(testDiv);

        try {
            const result = await gasAPI.callGASFunction('testConnection', {});
            testDiv.style.background = '#10b981';
            testDiv.innerHTML = '✅ Connected to Google Apps Script successfully!';
            console.log('✅ GAS Connection successful:', result);
            
            setTimeout(() => testDiv.remove(), 5000);
        } catch (error) {
            testDiv.style.background = '#ef4444';
            testDiv.innerHTML = `
                ❌ Connection Failed
                <br><small>${error.message}</small>
                <br><small>Check GAS deployment and doPost() function</small>
            `;
            console.error('❌ GAS Connection failed:', error);
        }
    }, 1000);
});

console.log('🚀 SmartStore 360 API Connector Loaded');