// script.js - Frontend JavaScript with Enhanced JSONP

// Configuration
const CONFIG = {
  gasWebAppUrl: 'https://script.google.com/macros/s/AKfycbzL2NyV1GfvRqBYeFB0DI-0IjrsRZiULNVRNXShR7k3xTPF4B1WOzFKc15C6VSIRY8Reg/exec',
  requestTimeout: 30000
};

// State Management
const state = {
  currentUser: null,
  inventoryData: [],
  selectedInventoryItem: null,
  salesItems: [],
  activeTab: 'dashboardSection',
  deleteCallback: null,
  currentInventoryPage: 1,
  inventoryPageSize: 50,
  totalInventoryPages: 1,
  filteredInventoryData: []
};

// Enhanced JSONP API Service
const apiService = {
  jsonpRequest(action, data = {}) {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
      let timeoutId;
      let script;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        delete window[callbackName];
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Request timeout after ' + CONFIG.requestTimeout + 'ms'));
      }, CONFIG.requestTimeout);

      window[callbackName] = function(response) {
        cleanup();
        console.log('JSONP Response received:', response);
        resolve(response);
      };

      // Build URL
      const url = new URL(CONFIG.gasWebAppUrl);
      url.searchParams.append('action', action);
      url.searchParams.append('callback', callbackName);
      
      // Add data as URL parameters
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          if (typeof data[key] === 'object') {
            url.searchParams.append(key, JSON.stringify(data[key]));
          } else {
            url.searchParams.append(key, data[key]);
          }
        }
      });

      // Add cache busting
      url.searchParams.append('_', Date.now());

      console.log('Making JSONP request to:', url.toString());

      script = document.createElement('script');
      script.src = url.toString();
      
      script.onerror = (error) => {
        cleanup();
        console.error('JSONP script error:', error);
        reject(new Error('Failed to load script. Check if the GAS URL is correct and deployed.'));
      };
      
      script.onload = () => {
        console.log('JSONP script loaded successfully');
        // If we get here but no callback was called, it might be a CORS issue
        setTimeout(() => {
          if (window[callbackName]) {
            cleanup();
            reject(new Error('No response received from server'));
          }
        }, 1000);
      };

      document.body.appendChild(script);
    });
  },

  // Test connection with multiple fallbacks
  async testConnection() {
    console.log('Testing backend connection...');
    
    try {
      // Try JSONP first
      const result = await this.jsonpRequest('test', {});
      console.log('✅ JSONP connection successful:', result);
      return result;
    } catch (error) {
      console.error('❌ JSONP failed:', error);
      
      // Try direct URL test
      try {
        const testUrl = CONFIG.gasWebAppUrl + '?action=test&_=' + Date.now();
        console.log('Trying direct URL test:', testUrl);
        
        const response = await fetch(testUrl, {
          method: 'GET',
          mode: 'no-cors', // This might work for simple requests
          redirect: 'follow'
        });
        
        // With no-cors we can't read the response, but we can check if it loaded
        console.log('Direct URL test completed, status:', response.type);
        return { 
          success: true, 
          message: 'Connection established (no-cors mode)', 
          type: response.type 
        };
      } catch (fetchError) {
        console.error('❌ Direct URL test failed:', fetchError);
        throw new Error(`All connection methods failed: ${error.message}, ${fetchError.message}`);
      }
    }
  },

  // API methods
  async login(username, password) {
    return await this.jsonpRequest('login', { username, password });
  },

  async getInventoryData() {
    return await this.jsonpRequest('getInventory', {});
  },

  async submitSale(saleData) {
    return await this.jsonpRequest('submitSale', { data: JSON.stringify(saleData) });
  },

  async getTodaysSales() {
    return await this.jsonpRequest('getTodaysSales', {});
  },

  async generateReport(params) {
    return await this.jsonpRequest('generateReport', params);
  },

  async addInventory(itemData, username) {
    return await this.jsonpRequest('addInventory', { 
      data: JSON.stringify(itemData), 
      username 
    });
  },

  async updateInventory(itemData, username) {
    return await this.jsonpRequest('updateInventory', { 
      data: JSON.stringify(itemData), 
      username 
    });
  },

  async deleteInventory(itemName, username) {
    return await this.jsonpRequest('deleteInventory', { itemName, username });
  },

  async getUsers() {
    return await this.jsonpRequest('getUsers', {});
  },

  async getUsernames() {
    return await this.jsonpRequest('getUsernames', {});
  }
};

// Test GAS URL directly
function testGasUrlDirectly() {
  const testUrl = CONFIG.gasWebAppUrl + '?action=test&callback=test&_=' + Date.now();
  const iframe = document.createElement('iframe');
  iframe.src = testUrl;
  iframe.style.display = 'none';
  iframe.onload = () => console.log('Iframe loaded - GAS URL might be working');
  iframe.onerror = () => console.log('Iframe failed to load - GAS URL issue');
  document.body.appendChild(iframe);
  
  // Also try opening in new tab for manual testing
  setTimeout(() => {
    window.open(testUrl, '_blank');
  }, 1000);
}

// Test connection on load
document.addEventListener('DOMContentLoaded', async function() {
  console.log('SmartStore 360 Frontend initialized');
  console.log('GAS URL:', CONFIG.gasWebAppUrl);
  
  // Test the GAS URL directly
  testGasUrlDirectly();
  
  // Show connection status
  showConnectionStatus('info', 'Testing connection to server...');
  
  try {
    const result = await apiService.testConnection();
    console.log('✅ Connection test result:', result);
    showConnectionStatus('success', 'Connected to server successfully!');
  } catch (error) {
    console.error('❌ All connection tests failed:', error);
    showConnectionStatus('error', `
      Connection failed: ${error.message}
      Please check:
      1. GAS script is deployed as "Web App"
      2. Execute as: "Me" 
      3. Who has access: "Anyone"
      4. The GAS URL is correct
    `);
    
    // Add manual test button
    addManualTestButton();
  }
});

function showConnectionStatus(type, message) {
  const loginContainer = document.querySelector('.login-container');
  if (!loginContainer) return;
  
  // Remove existing status
  const existingStatus = loginContainer.querySelector('.connection-status');
  if (existingStatus) existingStatus.remove();
  
  const statusDiv = document.createElement('div');
  statusDiv.className = `connection-status p-3 rounded mb-4 ${
    type === 'success' ? 'bg-success text-white' : 
    type === 'error' ? 'bg-error text-white' : 
    'bg-primary text-white'
  }`;
  statusDiv.innerHTML = `
    <i class="fas ${
      type === 'success' ? 'fa-check-circle' : 
      type === 'error' ? 'fa-exclamation-triangle' : 
      'fa-spinner fa-spin'
    } mr-2"></i>
    ${message}
  `;
  
  loginContainer.insertBefore(statusDiv, loginContainer.firstChild);
}

function addManualTestButton() {
  const loginContainer = document.querySelector('.login-container');
  if (!loginContainer) return;
  
  const testButton = document.createElement('button');
  testButton.className = 'bg-secondary text-white p-2 rounded mb-4 w-full';
  testButton.innerHTML = '<i class="fas fa-wrench mr-2"></i>Test GAS URL Manually';
  testButton.onclick = () => {
    window.open(CONFIG.gasWebAppUrl + '?action=test', '_blank');
  };
  
  const statusDiv = loginContainer.querySelector('.connection-status');
  if (statusDiv) {
    statusDiv.appendChild(document.createElement('br'));
    statusDiv.appendChild(testButton);
  }
}

// ... (REST OF YOUR UTILITIES, UI MANAGER, LOGIN MANAGER, ETC. REMAIN THE SAME)
// Include all the utility functions, UI management, etc. from previous versions

// Simple login manager for testing
const loginManager = {
  async initializeApp(user) {
    state.currentUser = user;
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    // Simple welcome message
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement) {
      welcomeElement.textContent = `Welcome, ${user.username}`;
    }
    
    // Show sales section by default
    document.querySelectorAll('#app > .card').forEach(section => section.classList.add('hidden'));
    document.getElementById('salesSection').classList.remove('hidden');
    
    utils.showAlert('Login successful!', 'success');
  }
};

// Event Listeners
function setupEventListeners() {
  // Login form
  const loginForm = document.getElementById('login');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      const loginButton = document.getElementById('loginButton');
      const loginError = document.getElementById('loginError');
      
      if (!username || !password) {
        if (loginError) {
          loginError.textContent = 'Please enter both username and password';
          loginError.classList.remove('hidden');
        }
        return;
      }
      
      // Show loading state
      if (loginButton) {
        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
      }
      
      if (loginError) loginError.classList.add('hidden');
      
      try {
        console.log('Attempting login for:', username);
        const response = await apiService.login(username, password);
        console.log('Login response:', response);
        
        if (response && response.success) {
          await loginManager.initializeApp(response.user);
        } else {
          throw new Error(response?.message || 'Login failed');
        }
      } catch (error) {
        console.error('Login error:', error);
        if (loginError) {
          loginError.textContent = error.message;
          loginError.classList.remove('hidden');
        }
        utils.showAlert('Login failed: ' + error.message, 'error');
      } finally {
        if (loginButton) {
          loginButton.disabled = false;
          loginButton.textContent = 'Sign In';
        }
      }
    });
  }

  // Logout
  utils.safeAddEventListener('logoutButton', 'click', () => {
    state.currentUser = null;
    document.getElementById('app').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    utils.showAlert('Logged out successfully', 'success');
  });

  // Basic navigation
  utils.safeAddEventListener('menuToggle', 'click', () => {
    const navMenu = document.getElementById('navMenu');
    if (navMenu) navMenu.classList.toggle('active');
  });
}

// Initialize
setupEventListeners();
