// API Connector with JSONP for CORS, error handling, retries (3 tries)
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzL2NyV1GfvRqBYeFB0DI-0IjrsRZiULNVRNXShR7k3xTPF4B1WOzFKc15C6VSIRY8Reg/exec';

function callGAS(functionName, data = {}, successCallback, errorCallback, retryCount = 3) {
    const callbackName = 'callback' + Date.now();
    
    // Create a copy of the data to avoid modifying the original
    const requestData = {...data};
    requestData.functionName = functionName;
    
    // TEMPORARY FIX: Make ALL data retrieval functions public
    // Only require token for functions that modify data
    const privateFunctions = [
        'addUser', 'deleteUser', 'addInventoryItem', 'updateInventoryItem', 
        'deleteInventoryItem', 'bulkUploadInventory', 'submitSaleData', 
        'deleteLastSale', 'deleteSale', 'changePassword', 'migratePasswords'
    ];
    
    // Only add token for private functions that modify data
    if (privateFunctions.includes(functionName)) {
        const token = localStorage.getItem('authToken');
        if (token) {
            requestData.token = token;
        } else {
            if (errorCallback) {
                errorCallback(new Error('No authentication token found. Please login again.'));
            }
            return;
        }
    }
    // For all other functions (data retrieval), don't require token
    
    const params = new URLSearchParams();
    Object.keys(requestData).forEach(key => {
        // Stringify objects for proper transmission
        const value = typeof requestData[key] === 'object' ? 
            JSON.stringify(requestData[key]) : 
            String(requestData[key]);
        params.append(key, value);
    });
    params.append('callback', callbackName);
    
    const script = document.createElement('script');
    script.src = `${GAS_WEB_APP_URL}?${params.toString()}`;
    
    const timeout = setTimeout(() => {
        if (script.parentNode) {
            document.body.removeChild(script);
        }
        delete window[callbackName];
        if (retryCount > 1) {
            callGAS(functionName, data, successCallback, errorCallback, retryCount - 1);
        } else if (errorCallback) {
            errorCallback(new Error('Request timed out'));
        }
    }, 10000);

    window[callbackName] = (response) => {
        clearTimeout(timeout);
        if (script.parentNode) {
            document.body.removeChild(script);
        }
        delete window[callbackName];
        
        if (response) {
            if (response.success) {
                if (successCallback) successCallback(response);
            } else {
                if (errorCallback) errorCallback(new Error(response.message || 'Unknown error'));
            }
        } else {
            if (errorCallback) errorCallback(new Error('Invalid response from server'));
        }
    };

    script.onerror = () => {
        clearTimeout(timeout);
        delete window[callbackName];
        if (retryCount > 1) {
            callGAS(functionName, data, successCallback, errorCallback, retryCount - 1);
        } else if (errorCallback) {
            errorCallback(new Error('Network error'));
        }
    };

    document.body.appendChild(script);
}

// Helper function to store login data properly
function storeLoginData(loginResult) {
    if (loginResult && loginResult.success && loginResult.token && loginResult.user) {
        localStorage.setItem('authToken', loginResult.token);
        localStorage.setItem('currentUser', JSON.stringify(loginResult.user));
        console.log('✅ Login data stored:', {
            token: loginResult.token.substring(0, 10) + '...',
            user: loginResult.user
        });
        return true;
    }
    console.error('❌ Invalid login result:', loginResult);
    return false;
}

// Helper function to check if user is logged in
function isLoggedIn() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    return !!(token && user);
}

// Helper function to logout
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Helper function to get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

// Helper function to get auth token
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Debug function to check auth status
function debugAuthStatus() {
    console.log('🔐 Auth Status:', {
        token: localStorage.getItem('authToken'),
        user: localStorage.getItem('currentUser'),
        isLoggedIn: isLoggedIn()
    });
}
