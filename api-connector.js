// API Connector with JSONP for CORS, error handling, retries (3 tries)
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzL2NyV1GfvRqBYeFB0DI-0IjrsRZiULNVRNXShR7k3xTPF4B1WOzFKc15C6VSIRY8Reg/exec';

function callGAS(functionName, data = {}, successCallback, errorCallback, retryCount = 3) {
  const callbackName = 'callback' + Date.now();
  
  // Create a copy of the data to avoid modifying the original
  const requestData = {...data};
  requestData.functionName = functionName;
  
  // Add token to all requests except login and public functions
  const publicFunctions = ['login', 'getAllUsernames', 'getAllUsers', 'getInventoryData', 'getInventoryMap'];
  
  if (!publicFunctions.includes(functionName)) {
    const token = localStorage.getItem('authToken');
    if (token) {
      requestData.token = token;
    } else {
      // For non-public functions without token, call error callback but don't throw
      if (errorCallback) {
        errorCallback(new Error('No authentication token found. Please login again.'));
      }
      return;
    }
  }
  
  const params = new URLSearchParams();
  Object.keys(requestData).forEach(key => {
    // Stringify objects for proper transmission
    const value = typeof requestData[key] === 'object' ? JSON.stringify(requestData[key]) : requestData[key];
    params.append(key, value);
  });
  params.append('callback', callbackName);
  
  const script = document.createElement('script');
  script.src = `${GAS_WEB_APP_URL}?${params.toString()}`;
  
  const timeout = setTimeout(() => {
    if (script.parentNode) {
      document.body.removeChild(script);
    }
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
    if (response && response.success) {
      if (successCallback) successCallback(response);
    } else {
      // If token is invalid, clear it and redirect to login
      if (response && response.message === 'Invalid token') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
      }
      if (errorCallback) errorCallback(new Error(response ? response.message : 'Unknown error'));
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
