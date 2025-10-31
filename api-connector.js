// API Connector with JSONP for CORS, error handling, retries (3 tries)
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzL2NyV1GfvRqBYeFB0DI-0IjrsRZiULNVRNXShR7k3xTPF4B1WOzFKc15C6VSIRY8Reg/exec';

function callGAS(functionName, data = {}, successCallback, errorCallback, retryCount = 3) {
  const callbackName = 'callback' + Date.now();
  
  // Create a copy of the data to avoid modifying the original
  const requestData = {...data};
  requestData.functionName = functionName;
  
  // Add token to all requests except login
  if (functionName !== 'login') {
    const token = localStorage.getItem('authToken');
    if (token) {
      requestData.token = token;
    } else {
      errorCallback(new Error('No authentication token found. Please login again.'));
      return;
    }
  }
  
  const params = new URLSearchParams();
  Object.keys(requestData).forEach(key => {
    params.append(key, requestData[key]);
  });
  params.append('callback', callbackName);
  
  const script = document.createElement('script');
  script.src = `${GAS_WEB_APP_URL}?${params.toString()}`;
  
  const timeout = setTimeout(() => {
    document.body.removeChild(script);
    if (retryCount > 1) {
      callGAS(functionName, data, successCallback, errorCallback, retryCount - 1);
    } else {
      errorCallback(new Error('Request timed out'));
    }
  }, 10000);

  window[callbackName] = (response) => {
    clearTimeout(timeout);
    document.body.removeChild(script);
    delete window[callbackName];
    if (response.success) {
      successCallback(response);
    } else {
      // If token is invalid, clear it and redirect to login
      if (response.message === 'Invalid token') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = '/login.html'; // Adjust to your login page
      }
      errorCallback(new Error(response.message || 'Unknown error'));
    }
  };

  script.onerror = () => {
    clearTimeout(timeout);
    delete window[callbackName];
    if (retryCount > 1) {
      callGAS(functionName, data, successCallback, errorCallback, retryCount - 1);
    } else {
      errorCallback(new Error('Network error'));
    }
  };

  document.body.appendChild(script);
}

// Helper function to store login data
function storeLoginData(loginResult) {
  if (loginResult.success && loginResult.token) {
    localStorage.setItem('authToken', loginResult.token);
    localStorage.setItem('currentUser', JSON.stringify(loginResult.user));
    return true;
  }
  return false;
}

// Helper function to check if user is logged in
function isLoggedIn() {
  return localStorage.getItem('authToken') !== null;
}

// Helper function to logout
function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  window.location.href = '/login.html'; // Adjust to your login page
}

// Helper function to get current user
function getCurrentUser() {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}
