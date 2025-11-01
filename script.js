// script.js - Frontend JavaScript with JSONP (CORS Bypass)

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

// JSONP API Service (CORS Bypass)
const apiService = {
  // JSONP implementation
  jsonpRequest(action, data = {}) {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
      const timeoutId = setTimeout(() => {
        delete window[callbackName];
        reject(new Error('Request timeout'));
      }, CONFIG.requestTimeout);

      window[callbackName] = function(response) {
        clearTimeout(timeoutId);
        delete window[callbackName];
        document.body.removeChild(script);
        resolve(response);
      };

      // Build URL with parameters
      const url = new URL(CONFIG.gasWebAppUrl);
      url.searchParams.append('action', action);
      url.searchParams.append('callback', callbackName);
      
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

      console.log(`Making JSONP request to:`, url.toString());

      const script = document.createElement('script');
      script.src = url.toString();
      script.onerror = () => {
        clearTimeout(timeoutId);
        delete window[callbackName];
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        reject(new Error('JSONP request failed'));
      };
      
      document.body.appendChild(script);
    });
  },

  // Test connection
  async testConnection() {
    return await this.jsonpRequest('test', {});
  },

  // Specific API methods
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

  async bulkUpload(items, username) {
    return await this.jsonpRequest('bulkUpload', { 
      data: JSON.stringify(items), 
      username 
    });
  },

  async getUsers() {
    return await this.jsonpRequest('getUsers', {});
  },

  async getUsernames() {
    return await this.jsonpRequest('getUsernames', {});
  },

  async addUser(userData, username) {
    return await this.jsonpRequest('addUser', { 
      data: JSON.stringify(userData), 
      username 
    });
  },

  async deleteUser(targetUsername, username) {
    return await this.jsonpRequest('deleteUser', { targetUsername, username });
  },

  async changePassword(currentUsername, targetUsername, newPassword, oldPassword, isManager) {
    return await this.jsonpRequest('changePassword', {
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
  console.log('Testing backend connection with JSONP...');
  
  try {
    const result = await apiService.testConnection();
    console.log('✅ Backend connection successful:', result);
    
    // Show success message
    showConnectionStatus('success', 'Connected to server successfully!');
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    showConnectionStatus('error', `Connection failed: ${error.message}`);
  }
});

function showConnectionStatus(type, message) {
  const loginContainer = document.querySelector('.login-container');
  if (!loginContainer) return;
  
  // Remove existing status messages
  const existingStatus = loginContainer.querySelector('.connection-status');
  if (existingStatus) {
    existingStatus.remove();
  }
  
  const statusDiv = document.createElement('div');
  statusDiv.className = `connection-status p-3 rounded mb-4 ${
    type === 'success' ? 'bg-success text-white' : 'bg-error text-white'
  }`;
  statusDiv.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2"></i>
    ${message}
  `;
  
  loginContainer.insertBefore(statusDiv, loginContainer.firstChild);
}

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

// UI Management
const uiManager = {
  setupAutocomplete(inputId, containerId, dataSource, onSelect) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    if (!input || !container) return;

    let timeout = null;

    function showSuggestions(suggestions) {
      container.innerHTML = '';
      if (suggestions.length === 0) {
        container.classList.add('hidden');
        return;
      }
      const fragment = document.createDocumentFragment();
      suggestions.forEach(item => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.textContent = item;
        div.addEventListener('click', () => {
          input.value = item;
          container.classList.add('hidden');
          onSelect && onSelect(item);
        });
        fragment.appendChild(div);
      });
      container.appendChild(fragment);
      container.classList.remove('hidden');
    }

    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      if (query.length < 1) {
        container.classList.add('hidden');
        return;
      }
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const suggestions = dataSource()
          .filter(item => item && item.toLowerCase().includes(query))
          .slice(0, 5);
        showSuggestions(suggestions);
      }, 300);
    });

    input.addEventListener('blur', () => setTimeout(() => container.classList.add('hidden'), 200));
    input.addEventListener('focus', () => {
      if (input.value.trim()) {
        const suggestions = dataSource()
          .filter(item => item && item.toLowerCase().includes(input.value.trim().toLowerCase()))
          .slice(0, 5);
        showSuggestions(suggestions);
      }
    });
  },

  updateAvailableStock(itemName) {
    const stockSpan = document.getElementById('availableStock');
    const inventoryItem = state.inventoryData.find(item => item.name.toLowerCase() === itemName.toLowerCase());
    stockSpan.textContent = `Available: ${inventoryItem ? inventoryItem.stock : 0}`;
  },

  updatePurchaseSummary() {
    const breakdown = document.getElementById('salesBreakdown');
    breakdown.innerHTML = '';
    if (state.salesItems.length === 0) {
      breakdown.innerHTML = '<p class="font-bold text-dark">Purchase Summary: No items added</p>';
      breakdown.classList.add('hidden');
      return;
    }
    let total = 0;
    const fragment = document.createDocumentFragment();
    const summaryP = document.createElement('p');
    summaryP.className = 'font-bold text-dark';
    summaryP.textContent = 'Purchase Summary';
    fragment.appendChild(summaryP);
    state.salesItems.forEach((item, index) => {
      const subtotal = item.quantity * item.unitPrice;
      total += subtotal;
      const p = document.createElement('p');
      const displayName = item.itemName.length > 20 ? item.itemName.substring(0, 17) + '...' : item.itemName;
      const detailsSpan = document.createElement('span');
      detailsSpan.className = 'item-details';
      detailsSpan.dataset.fullName = item.itemName;
      detailsSpan.title = item.itemName;
      detailsSpan.textContent = `${displayName} (${item.quantity} x GHC ${item.unitPrice.toFixed(2)})`;
      p.appendChild(detailsSpan);
      const subtotalSpan = document.createElement('span');
      subtotalSpan.className = 'subtotal';
      subtotalSpan.innerHTML = `GHC ${subtotal.toFixed(2)}`;
      const removeButton = document.createElement('button');
      removeButton.className = 'remove-item';
      removeButton.dataset.index = index;
      removeButton.title = 'Remove Item';
      removeButton.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
      removeButton.addEventListener('click', () => {
        state.salesItems.splice(index, 1);
        this.updatePurchaseSummary();
      });
      subtotalSpan.appendChild(removeButton);
      p.appendChild(subtotalSpan);
      fragment.appendChild(p);
    });
    const grandP = document.createElement('p');
    grandP.className = 'font-bold text-dark grand-total';
    grandP.textContent = 'Grand Total: ';
    const grandSpan = document.createElement('span');
    grandSpan.className = 'subtotal';
    grandSpan.textContent = `GHC ${total.toFixed(2)}`;
    grandP.appendChild(grandSpan);
    fragment.appendChild(grandP);
    breakdown.appendChild(fragment);
    breakdown.classList.remove('hidden');
  },

  showTab(tabId) {
    if (utils.isTabRestricted(tabId) && state.currentUser?.role !== 'Manager') {
      utils.showAlert('Access denied. This section is for managers only.', 'error');
      tabId = 'salesSection';
    }
    
    document.querySelectorAll('#app > .card').forEach(section => section.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    state.activeTab = tabId;
    
    const tabNames = {
      'dashboardSection': 'Dashboard',
      'salesSection': 'Sales',
      'inventorySection': 'Inventory',
      'reportsSection': 'Reports',
      'changePasswordSection': 'Change Password',
      'manageUsersSection': 'Manage Users'
    };
    
    document.getElementById('activeTabName').textContent = tabNames[tabId] || 'Sales';
    document.getElementById('navMenu').classList.remove('active');
    
    if (tabId === 'inventorySection') {
      inventoryManager.loadInventory();
    } else if (tabId === 'reportsSection') {
      const today = utils.formatDateToYYYYMMDD(new Date());
      document.getElementById('reportDate').value = today;
      document.getElementById('summaryStartDate').value = today;
      document.getElementById('summaryEndDate').value = today;
      document.getElementById('reportMonth').value = utils.formatDateToYYYYMM(today);
    }
  },

  updateTabVisibility() {
    const isManager = state.currentUser?.role === 'Manager';
    
    document.querySelectorAll('.manager-only').forEach(el => {
      el.classList.toggle('hidden', !isManager);
    });
    
    document.getElementById('menuToggle').classList.remove('hidden');
    
    if (!isManager && utils.isTabRestricted(state.activeTab)) {
      this.showTab('salesSection');
    }
  }
};

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
    
    // Update welcome message
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement) {
      welcomeElement.textContent = `Welcome, ${user.username}`;
    }
    
    const defaultTab = utils.getDefaultTabForUser(user);
    state.activeTab = defaultTab;
    
    uiManager.updateTabVisibility();
    uiManager.showTab(defaultTab);
    
    const today = utils.formatDateToYYYYMMDD(new Date());
    document.getElementById('saleDate').value = today;
    document.getElementById('reportDate').value = today;
    document.getElementById('summaryStartDate').value = today;
    document.getElementById('summaryEndDate').value = today;
    document.getElementById('reportMonth').value = utils.formatDateToYYYYMM(today);
    
    // Load inventory
    await inventoryManager.loadInventory(() => {
      uiManager.setupAutocomplete('itemName', 'itemNameAutocomplete', 
        () => state.inventoryData.map(item => item.name).filter(name => name), 
        (itemName) => {
          const inventoryItem = state.inventoryData.find(item => item.name === itemName);
          if (inventoryItem) {
            document.getElementById('unitPrice').value = inventoryItem.price.toFixed(2);
            document.getElementById('cost').value = inventoryItem.cost.toFixed(2);
            uiManager.updateAvailableStock(itemName);
            document.getElementById('quantity').focus();
          }
        }
      );
    });
    
    utils.showAlert('Login successful!', 'success');
  }
};

// Inventory Management
const inventoryManager = {
  async loadInventory(callback) {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="border p-2 text-center"><i class="fa-solid fa-spinner fa-spin text-primary"></i> Loading inventory...</td></tr>';
    
    try {
      const data = await apiService.getInventoryData();
      state.inventoryData = data || [];
      
      // Apply basic filtering
      state.filteredInventoryData = state.inventoryData;
      state.totalInventoryPages = Math.ceil(state.filteredInventoryData.length / state.inventoryPageSize);
      state.currentInventoryPage = 1;
      
      this.updateInventoryTable();
      this.updatePaginationControls();
      this.updateRowCount();
      
      callback && callback();
    } catch (error) {
      console.error('Inventory load error:', error);
      utils.showAlert('Failed to load inventory: ' + (error.message || 'Unknown error'), 'error');
      tbody.innerHTML = '<tr><td colspan="7" class="border p-2 text-center">Error loading inventory</td></tr>';
      callback && callback();
    }
  },

  updateInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';
    const startIndex = (state.currentInventoryPage - 1) * state.inventoryPageSize;
    const endIndex = Math.min(startIndex + state.inventoryPageSize, state.filteredInventoryData.length);
    const pageData = state.filteredInventoryData.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.className = 'border p-2 text-center';
      td.textContent = 'No items found';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    
    const fragment = document.createDocumentFragment();
    pageData.forEach((item, index) => {
      const globalIndex = startIndex + index;
      const isSelected = state.selectedInventoryItem && state.selectedInventoryItem.name === item.name;
      const tr = document.createElement('tr');
      tr.className = isSelected ? 'selected' : '';
      tr.dataset.index = globalIndex;
      
      tr.innerHTML = `
        <td class="border p-2">${item.name || ''}</td>
        <td class="border p-2">${item.stock ?? 0}</td>
        <td class="border p-2">GHC ${(item.cost ?? 0).toFixed(2)}</td>
        <td class="border p-2">GHC ${(item.price ?? 0).toFixed(2)}</td>
        <td class="border p-2">${utils.formatDateToYYYYMMDD(item.purchaseDate)}</td>
        <td class="border p-2">${item.reorderLevel ?? 0}</td>
        <td class="border p-2">
          <span class="status-${(item.status || 'In Stock').toLowerCase().replace(' ', '-')}">
            ${item.status || 'In Stock'}
          </span>
        </td>
      `;
      
      tr.addEventListener('click', function() {
        document.querySelectorAll('#inventoryTableBody tr').forEach(r => r.classList.remove('selected'));
        this.classList.add('selected');
        const itemIndex = parseInt(this.dataset.index);
        state.selectedInventoryItem = { ...state.filteredInventoryData[itemIndex], index: itemIndex };
      });
      
      fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
  },

  updatePaginationControls() {
    const paginationContainer = document.getElementById('inventoryPagination');
    
    if (state.totalInventoryPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }
    
    paginationContainer.innerHTML = '';
    // Simple pagination implementation
    for (let i = 1; i <= state.totalInventoryPages; i++) {
      const button = document.createElement('button');
      button.className = `pagination-page ${i === state.currentInventoryPage ? 'active' : ''}`;
      button.textContent = i;
      button.addEventListener('click', () => {
        state.currentInventoryPage = i;
        this.updateInventoryTable();
      });
      paginationContainer.appendChild(button);
    }
  },

  updateRowCount() {
    const rowCountElement = document.getElementById('rowCount');
    const totalItems = state.filteredInventoryData.length;
    rowCountElement.textContent = `Showing ${totalItems} items`;
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
    state.salesItems = [];
    state.inventoryData = [];
    state.selectedInventoryItem = null;
    document.getElementById('app').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('login').reset();
    document.getElementById('loginError').classList.add('hidden');
    utils.showAlert('Logged out successfully', 'success');
  });

  // Navigation
  utils.safeAddEventListener('menuToggle', 'click', () => {
    document.getElementById('navMenu').classList.toggle('active');
  });

  document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      uiManager.showTab(link.getAttribute('data-tab'));
    });
  });

  // Add basic sales functionality
  utils.safeAddEventListener('addItemButton', 'click', () => {
    const itemName = document.getElementById('itemName').value.trim();
    const quantity = parseInt(document.getElementById('quantity').value);
    const unitPrice = parseFloat(document.getElementById('unitPrice').value);

    if (!itemName || isNaN(quantity) || isNaN(unitPrice)) {
      utils.showAlert('Please fill all fields correctly', 'error');
      return;
    }

    const item = { itemName, quantity, unitPrice };
    state.salesItems.push(item);
    uiManager.updatePurchaseSummary();
    
    // Clear form
    document.getElementById('itemName').value = '';
    document.getElementById('quantity').value = '';
    document.getElementById('unitPrice').value = '';
  });
}

// Initialize the application
setupEventListeners();
