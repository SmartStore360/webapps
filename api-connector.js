// API Connector with JSONP for CORS, error handling, retries (3 tries)

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'; // Replace with your GAS URL

function callGAS(functionName, data = {}, successCallback, errorCallback, retryCount = 3) {
  const callbackName = 'callback' + Date.now();
  data.functionName = functionName;
  
  const params = new URLSearchParams(data).toString();
  const script = document.createElement('script');
  script.src = `${GAS_WEB_APP_URL}?${params}&callback=${callbackName}`;
  
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
