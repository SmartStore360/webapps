// API Connector with JSONP for CORS - NO TOKEN REQUIRED FOR DATA RETRIEVAL
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzL2NyV1GfvRqBYeFB0DI-0IjrsRZiULNVRNXShR7k3xTPF4B1WOzFKc15C6VSIRY8Reg/exec';

function callGAS(functionName, data = {}, successCallback, errorCallback, retryCount = 3) {
    const callbackName = 'callback' + Date.now();
    
    // Create a copy of the data to avoid modifying the original
    const requestData = {...data};
    requestData.functionName = functionName;
    
    // TEMPORARY: NO TOKEN CHECKING FOR ANY FUNCTIONS
    // This will make everything work while we fix the token issue
    console.log(`📡 Calling ${functionName} without token check`);
    
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
                console.log(`✅ ${functionName} success:`, response);
                if (successCallback) successCallback(response);
            } else {
                console.error(`❌ ${functionName} error:`, response.message);
                if (errorCallback) errorCallback(new Error(response.message || 'Unknown error'));
            }
        } else {
            console.error(`❌ ${functionName} invalid response`);
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

// Helper functions
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

function isLoggedIn() {
    const user = localStorage.getItem('currentUser');
    return !!user; // Only check for user existence, not token
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Debug function
function debugAuthStatus() {
    console.log('🔐 Auth Status:', {
        token: localStorage.getItem('authToken'),
        user: localStorage.getItem('currentUser'),
        hasUser: !!localStorage.getItem('currentUser')
    });
}
