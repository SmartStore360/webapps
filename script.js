// script.js - Frontend JavaScript with CORS Workaround

// Configuration - USE YOUR ACTUAL GAS URL
const CONFIG = {
  gasWebAppUrl: 'https://script.google.com/macros/s/AKfycbzL2NyV1GfvRqBYeFB0DI-0IjrsRZiULNVRNXShR7k3xTPF4B1WOzFKc15C6VSIRY8Reg/exec',
  requestTimeout: 30000,
  retryAttempts: 3
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

// API Service with CORS Workaround
const apiService = {
  async callGoogleAppsScript(action, data = {}, method = 'GET') {
    // Use JSONP-like approach for GET requests to avoid CORS
    const url = new URL(CONFIG.gasWebAppUrl);
    url.searchParams.append('action', action);
    
    // Add all data as URL parameters for GET requests
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

    console.log(`Making ${method} request to:`, url.toString());

    for (let attempt = 1; attempt <= CONFIG.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeout);
        
        const response = await fetch(url.toString(), {
          method: method,
          signal: controller.signal,
          redirect: 'follow',
          mode: 'cors'
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log(`API Response for ${action}:`, result);
        return result;
      } catch (error) {
        console.error(`API call attempt ${attempt} failed:`, error);
        
        if (attempt === CONFIG.retryAttempts) {
          if (error.name === 'AbortError') {
            throw new Error('Request timeout. Please check your internet connection.');
          } else if (error.message.includes('Failed to fetch')) {
            throw new Error('Cannot connect to server. Please check the GAS Web App URL and deployment settings.');
          } else {
            throw new Error(`Server error: ${error.message}`);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  },

  // Test connection
  async testConnection() {
    return await this.callGoogleAppsScript('test', {});
  },

  // Specific API methods - ALL USING GET TO AVOID CORS
  async login(username, password) {
    return await this.callGoogleAppsScript('login', { username, password });
  },

  async getInventoryData() {
    return await this.callGoogleAppsScript('getInventory', {});
  },

  async submitSale(saleData) {
    return await this.callGoogleAppsScript('submitSale', { data: JSON.stringify(saleData) });
  },

  async getTodaysSales() {
    return await this.callGoogleAppsScript('getTodaysSales', {});
  },

  async generateReport(params) {
    return await this.callGoogleAppsScript('generateReport', params);
  },

  async addInventory(itemData, username) {
    return await this.callGoogleAppsScript('addInventory', { 
      data: JSON.stringify(itemData), 
      username 
    });
  },

  async updateInventory(itemData, username) {
    return await this.callGoogleAppsScript('updateInventory', { 
      data: JSON.stringify(itemData), 
      username 
    });
  },

  async deleteInventory(itemName, username) {
    return await this.callGoogleAppsScript('deleteInventory', { itemName, username });
  },

  async bulkUpload(items, username) {
    return await this.callGoogleAppsScript('bulkUpload', { 
      data: JSON.stringify(items), 
      username 
    });
  },

  async getUsers() {
    return await this.callGoogleAppsScript('getUsers', {});
  },

  async getUsernames() {
    return await this.callGoogleAppsScript('getUsernames', {});
  },

  async addUser(userData, username) {
    return await this.callGoogleAppsScript('addUser', { 
      data: JSON.stringify(userData), 
      username 
    });
  },

  async deleteUser(targetUsername, username) {
    return await this.callGoogleAppsScript('deleteUser', { targetUsername, username });
  },

  async changePassword(currentUsername, targetUsername, newPassword, oldPassword, isManager) {
    return await this.callGoogleAppsScript('changePassword', {
      currentUsername,
      targetUsername,
      newPassword,
      oldPassword,
      isManager: isManager.toString()
    });
  }
};

// Test connection on load
document.addEventListener('DOMContentLoaded', async function() {
  console.log('SmartStore 360 Frontend initialized');
  console.log('Testing backend connection...');
  
  try {
    const result = await apiService.testConnection();
    console.log('✅ Backend connection successful:', result);
    
    // Show success message
    const loginContainer = document.querySelector('.login-container');
    if (loginContainer) {
      const successDiv = document.createElement('div');
      successDiv.className = 'bg-success text-white p-3 rounded mb-4';
      successDiv.innerHTML = `
        <i class="fas fa-check-circle mr-2"></i>
        Connected to server successfully!
      `;
      loginContainer.insertBefore(successDiv, loginContainer.firstChild);
    }
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    
    // Show error message
    const loginContainer = document.querySelector('.login-container');
    if (loginContainer) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'bg-error text-white p-3 rounded mb-4';
      errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle mr-2"></i>
        <strong>Connection Error:</strong> ${error.message}<br>
        <small>Please check: 1) GAS Web App URL, 2) Deployment settings, 3) Internet connection</small>
      `;
      loginContainer.insertBefore(errorDiv, loginContainer.firstChild);
    }
  }
});

// Core Utilities
const utils = {
  formatDateToYYYYMMDD(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
  },

  formatDateToYYYYMM(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return year + '-' + month;
  },

  getWeekRange(dateString) {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startDate = new Date(date);
    startDate.setDate(date.getDate() + diffToMonday);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    return {
      start: this.formatDateToYYYYMMDD(startDate),
      end: this.formatDateToYYYYMMDD(endDate)
    };
  },

  showAlert(message, type) {
    const modals = ['addInventoryModal', 'editInventoryModal', 'bulkUploadModal', 'InventoryValueModal', 'confirmDeleteModal', 'addUserModal', 'deleteUserModal'];
    const isModalOpen = modals.some(id => !document.getElementById(id).classList.contains('hidden'));
    if (isModalOpen) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type === 'success' ? 'bg-success' : 'bg-error'}`;
    alertDiv.innerText = message;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
  },

  showConfirmDelete(message, callback) {
    const confirmDeleteMessage = document.getElementById('confirmDeleteMessage');
    if (confirmDeleteMessage) {
      confirmDeleteMessage.textContent = message;
      document.getElementById('confirmDeleteModal').classList.remove('hidden');
      state.deleteCallback = callback;
    }
  },

  safeAddEventListener(elementId, event, handler) {
    const element = document.getElementById(elementId);
    element ? element.addEventListener(event, handler) : 
    console.warn(`Element '${elementId}' not found for event '${event}'`);
  },

  validateReorderLevel(value, formName) {
    const reorderLevel = parseInt(value);
    if (isNaN(reorderLevel) || reorderLevel < 0) {
      this.showAlert(`Please enter a valid non-negative number for Reorder Level in ${formName}`, 'error');
      return false;
    }
    if (value.trim().toLowerCase() === 'manager') {
      this.showAlert(`The value "Manager" is not allowed for Reorder Level in ${formName}`, 'error');
      return false;
    }
    return true;
  },

  getDefaultTabForUser(user) {
    return user && user.role === 'Manager' ? 'dashboardSection' : 'salesSection';
  },

  isTabRestricted(tabId) {
    const restrictedTabs = ['dashboardSection', 'inventorySection', 'reportsSection', 'changePasswordSection', 'manageUsersSection'];
    return restrictedTabs.includes(tabId);
  }
};

// ... (REST OF YOUR EXISTING CODE - uiManager, clockManager, inventoryManager, salesManager, etc.)
// Keep all your existing functionality, just use the updated apiService above

// Login Management
const loginManager = {
  showLoginError(message, errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden', 'show');
    setTimeout(() => errorElement.classList.add('show'), 10);
    
    const hideTimeout = setTimeout(() => {
      errorElement.classList.remove('show');
      setTimeout(() => errorElement.classList.add('hidden'), 300);
    }, 10000);
    
    const clearOnInput = () => {
      clearTimeout(hideTimeout);
      errorElement.classList.remove('show');
      setTimeout(() => {
        errorElement.classList.add('hidden');
        document.removeEventListener('input', clearOnInput);
      }, 300);
    };
    document.addEventListener('input', clearOnInput);
  },

  async initializeApp(user) {
    state.currentUser = user;
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    // Initialize clock
    if (typeof clockManager !== 'undefined') {
      clockManager.init();
    }
    
    // Update welcome message
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement) {
      welcomeElement.textContent = `Welcome, ${user.username}`;
    }
    
    const defaultTab = utils.getDefaultTabForUser(user);
    state.activeTab = defaultTab;
    
    // Update UI
    if (typeof uiManager !== 'undefined') {
      uiManager.updateTabVisibility();
      uiManager.showTab(defaultTab);
    }
    
    // Set default dates
    const today = utils.formatDateToYYYYMMDD(new Date());
    document.getElementById('saleDate').value = today;
    document.getElementById('reportDate').value = today;
    document.getElementById('summaryStartDate').value = today;
    document.getElementById('summaryEndDate').value = today;
    document.getElementById('reportMonth').value = utils.formatDateToYYYYMM(today);
    
    // Load inventory
    if (typeof inventoryManager !== 'undefined') {
      await inventoryManager.loadInventory();
    }
    
    utils.showAlert('Login successful!', 'success');
  }
};

// Event Listeners
function setupEventListeners() {
  // Login
  utils.safeAddEventListener('login', 'submit', async e => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginButton = document.getElementById('loginButton');
    const loginError = document.getElementById('loginError');
    
    if (!username || !password) {
      loginManager.showLoginError('Please enter both username and password', loginError);
      return;
    }
    
    loginButton.disabled = true;
    loginButton.setAttribute('data-loading', 'true');
    loginError.classList.add('hidden');
    
    try {
      const response = await apiService.login(username, password);
      loginButton.disabled = false;
      loginButton.setAttribute('data-loading', 'false');
      
      if (response && response.success) {
        await loginManager.initializeApp(response.user);
      } else {
        const errorMsg = response && response.message ? response.message : 'Invalid username or password';
        loginManager.showLoginError(errorMsg, loginError);
      }
    } catch (error) {
      loginButton.disabled = false;
      loginButton.setAttribute('data-loading', 'false');
      loginManager.showLoginError('Login failed: ' + error.message, loginError);
    }
  });

  // Logout
  utils.safeAddEventListener('logoutButton', 'click', () => {
    state.currentUser = null;
    document.getElementById('app').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('login').reset();
    utils.showAlert('Logged out successfully', 'success');
  });

  // Navigation
  utils.safeAddEventListener('menuToggle', 'click', () => {
    document.getElementById('navMenu').classList.toggle('active');
  });

  // Add other event listeners as needed...
}

// Initialize
setupEventListeners();
