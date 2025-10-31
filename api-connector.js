// SIMPLE WORKING API CONNECTOR
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzHuHzK0H0OI0LrwAYY7taRKBw5d7Q76Vzr0v7FY37RwssszhkeCYMYRRfijMci5iym9Q/exec'; // ⬅️ REPLACE WITH NEW URL

function callGAS(functionName, data = {}) {
    return new Promise((resolve, reject) => {
        const callbackName = `gas_${Date.now()}`;
        
        window[callbackName] = function(response) {
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
            resolve(response);
        };

        const params = new URLSearchParams();
        params.append('function', functionName);
        params.append('callback', callbackName);
        if (Object.keys(data).length > 0) {
            params.append('data', JSON.stringify(data));
        }

        const script = document.createElement('script');
        script.src = `${GAS_WEB_APP_URL}?${params.toString()}`;
        script.onerror = function() {
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
            reject(new Error(`Failed to load GAS script. Check deployment.`));
        };

        document.head.appendChild(script);
    });
}

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
        callGAS('testConnection').then(this.successCallback).catch(this.failureCallback);
        return this;
    },
    login(username, password) {
        callGAS('login', { username, password }).then(this.successCallback).catch(this.failureCallback);
        return this;
    },
    getInventoryData() {
        callGAS('getInventoryData').then(this.successCallback).catch(this.failureCallback);
        return this;
    },
    submitSaleData(saleData) {
        callGAS('submitSaleData', saleData).then(this.successCallback).catch(this.failureCallback);
        return this;
    },
    generateReport(params) {
        callGAS('generateReport', params).then(this.successCallback).catch(this.failureCallback);
        return this;
    },
    addInventoryItem(itemData, username) {
        callGAS('addInventoryItem', { ...itemData, username }).then(this.successCallback).catch(this.failureCallback);
        return this;
    },
    updateInventoryItem(itemData, username) {
        callGAS('updateInventoryItem', { ...itemData, username }).then(this.successCallback).catch(this.failureCallback);
        return this;
    },
    deleteInventoryItem(itemName, username) {
        callGAS('deleteInventoryItem', { itemName, username }).then(this.successCallback).catch(this.failureCallback);
        return this;
    },
    bulkUploadInventory(items, username) {
        callGAS('bulkUploadInventory', { items, username }).then(this.successCallback).catch(this.failureCallback);
        return this;
    },
    getTodaysSalesBreakdown() {
        callGAS('getTodaysSalesBreakdown').then(this.successCallback).catch(this.failureCallback);
        return this;
    },
    getAllUsers() {
        callGAS('getAllUsers').then(this.successCallback).catch(this.failureCallback);
        return this;
    },
    getAllUsernames() {
        callGAS('getAllUsernames').then(this.successCallback).catch(this.failureCallback);
        return this;
    },
    addUser(userData, currentUser) {
        callGAS('addUser', { ...userData, currentUser }).then(this.successCallback).catch(this.failureCallback);
        return this;
    },
    deleteUser(username, currentUser) {
        callGAS('deleteUser', { username, currentUser }).then(this.successCallback).catch(this.failureCallback);
        return this;
    },
    changePassword(currentUser, targetUser, newPassword, oldPassword, isManager) {
        callGAS('changePassword', { currentUser, targetUser, newPassword, oldPassword, isManager }).then(this.successCallback).catch(this.failureCallback);
        return this;
    }
};

// Test connection on load
setTimeout(() => {
    const status = document.createElement('div');
    status.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #3b82f6;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    status.innerHTML = '🔄 Testing GAS Connection...';
    document.body.appendChild(status);

    callGAS('testConnection')
        .then(result => {
            status.style.background = '#10b981';
            status.innerHTML = '✅ Connected to GAS!';
            setTimeout(() => status.remove(), 4000);
        })
        .catch(error => {
            status.style.background = '#ef4444';
            status.innerHTML = `❌ Connection Failed<br><small>${error.message}</small>`;
        });
}, 1000);