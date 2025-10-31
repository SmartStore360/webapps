// SMARTSTORE 360 API CONNECTOR - UPDATED
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzHuHzK0H0OI0LrwAYY7taRKBw5d7Q76Vzr0v7FY37RwssszhkeCYMYRRfijMci5iym9Q/exec';

function callGAS(functionName, data = {}) {
    return new Promise((resolve, reject) => {
        const callbackName = `gas_${Date.now()}`;
        
        window[callbackName] = function(response) {
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
            console.log('✅ GAS Response:', response);
            resolve(response);
        };

        const params = new URLSearchParams();
        params.append('function', functionName);
        params.append('callback', callbackName);
        if (Object.keys(data).length > 0) {
            params.append('data', JSON.stringify(data));
        }

        const script = document.createElement('script');
        const fullUrl = `${GAS_WEB_APP_URL}?${params.toString()}`;
        console.log('🔗 Calling GAS URL:', fullUrl);
        script.src = fullUrl;
        
        script.onerror = function() {
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
            console.error('❌ Script load failed');
            reject(new Error(`Failed to connect to Google Apps Script`));
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
document.addEventListener('DOMContentLoaded', function() {
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
            max-width: 90%;
        `;
        status.innerHTML = '🔄 Testing Connection to Google Apps Script...';
        document.body.appendChild(status);

        console.log('🔍 Testing GAS connection...');
        callGAS('testConnection')
            .then(result => {
                status.style.background = '#10b981';
                status.innerHTML = '✅ Connected Successfully!<br><small>You can now login with admin/admin</small>';
                console.log('✅ GAS Connection successful:', result);
                setTimeout(() => status.remove(), 5000);
            })
            .catch(error => {
                status.style.background = '#ef4444';
                status.innerHTML = `❌ Connection Failed<br><small>${error.message}</small><br><small>Check GAS deployment settings</small>`;
                console.error('❌ GAS Connection failed:', error);
            });
    }, 1000);
});
// Backend Service Module
const BackendService = {
  baseUrl: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
  
  async testConnection() {
    try {
      const timestamp = new Date().getTime();
      const url = `${this.baseUrl}?t=${timestamp}`; // Avoid cache
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🎉 Backend connection successful!', data);
      return data;
    } catch (error) {
      console.error('💥 Backend connection failed:', error);
      return null;
    }
  }
};

// Test the connection when app starts
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 SmartStore 360 App Initializing...');
  
  // Test backend connection after a short delay
  setTimeout(() => {
    BackendService.testConnection();
  }, 1000);
  
  console.log('✅ SmartStore 360 App Ready!');
});