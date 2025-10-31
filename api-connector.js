// ULTRA-SIMPLE API CONNECTOR
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzsPAgFCeySVAdFyvGxgyewCwrB3Md8Yes9Y0iZtToW65pOiR2Ck8NddYgocDTnehF-/exec'; // ⬅️ REPLACE THIS!

async function callGAS(functionName, data = {}) {
    return new Promise((resolve, reject) => {
        const callbackName = `cb_${Date.now()}`;
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Timeout'));
        }, 10000);

        function cleanup() {
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
            clearTimeout(timeout);
        }

        window[callbackName] = (response) => {
            cleanup();
            resolve(response);
        };

        const params = new URLSearchParams();
        params.append('function', functionName);
        params.append('callback', callbackName);
        params.append('data', JSON.stringify(data));

        const script = document.createElement('script');
        script.src = `${GAS_WEB_APP_URL}?${params}`;
        script.onerror = () => {
            cleanup();
            reject(new Error(`Failed to connect to: ${GAS_WEB_APP_URL}`));
        };

        document.head.appendChild(script);
    });
}

// Mock google.script.run
window.google = window.google || {};
window.google.script = window.google.script || {};
window.google.script.run = {
    withSuccessHandler(cb) { this.success = cb; return this; },
    withFailureHandler(cb) { this.failure = cb; return this; },
    
    testConnection() { callGAS('testConnection').then(this.success).catch(this.failure); return this; },
    login(u,p) { callGAS('login', {username:u,password:p}).then(this.success).catch(this.failure); return this; },
    getInventoryData() { callGAS('getInventoryData').then(this.success).catch(this.failure); return this; },
    submitSaleData(d) { callGAS('submitSaleData', d).then(this.success).catch(this.failure); return this; },
    generateReport(p) { callGAS('generateReport', p).then(this.success).catch(this.failure); return this; },
    addInventoryItem(i,u) { callGAS('addInventoryItem', {...i,username:u}).then(this.success).catch(this.failure); return this; },
    updateInventoryItem(i,u) { callGAS('updateInventoryItem', {...i,username:u}).then(this.success).catch(this.failure); return this; },
    deleteInventoryItem(n,u) { callGAS('deleteInventoryItem', {itemName:n,username:u}).then(this.success).catch(this.failure); return this; },
    bulkUploadInventory(i,u) { callGAS('bulkUploadInventory', {items:i,username:u}).then(this.success).catch(this.failure); return this; },
    getTodaysSalesBreakdown() { callGAS('getTodaysSalesBreakdown').then(this.success).catch(this.failure); return this; },
    getAllUsers() { callGAS('getAllUsers').then(this.success).catch(this.failure); return this; },
    getAllUsernames() { callGAS('getAllUsernames').then(this.success).catch(this.failure); return this; },
    addUser(u,c) { callGAS('addUser', {...u,currentUser:c}).then(this.success).catch(this.failure); return this; },
    deleteUser(u,c) { callGAS('deleteUser', {username:u,currentUser:c}).then(this.success).catch(this.failure); return this; },
    changePassword(c,t,n,o,i) { callGAS('changePassword', {currentUser:c,targetUser:t,newPassword:n,oldPassword:o,isManager:i}).then(this.success).catch(this.failure); return this; }
};

// Test connection
setTimeout(() => {
    const status = document.createElement('div');
    status.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#3b82f6;color:white;padding:15px;border-radius:5px;z-index:10000;font-family:Arial;text-align:center;';
    status.innerHTML = 'Testing connection...';
    document.body.appendChild(status);

    callGAS('testConnection').then(result => {
        status.style.background = '#10b981';
        status.innerHTML = '✅ Connected!';
        setTimeout(() => status.remove(), 3000);
    }).catch(error => {
        status.style.background = '#ef4444';
        status.innerHTML = `❌ Failed: ${error.message}`;
    });
}, 1000);