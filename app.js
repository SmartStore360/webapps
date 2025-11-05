// Updated API Service in app.js
class GASApiService {
    constructor() {
        this.baseUrl = 'https://script.google.com/macros/s/AKfycbxs_M_Ht793D0LzJt3D3yG6hcUKheojxSrK1I5cesnkmjlUukXxtJZGpOPew5MzXOosnw/exec; // Replace with your deployed GAS web app URL
        this.token = localStorage.getItem('authToken');
        this.sessionId = localStorage.getItem('sessionId');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const config = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };

        // Add authorization if available
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }
        if (this.sessionId) {
            config.headers['X-Session-ID'] = this.sessionId;
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle session management from response
            if (data.data && data.data.sessionId) {
                this.sessionId = data.data.sessionId;
                localStorage.setItem('sessionId', data.data.sessionId);
            }
            
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            
            // Handle CORS errors specifically
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Cannot connect to server. Please check your internet connection and ensure the GAS web app URL is correct.');
            }
            
            throw error;
        }
    }


    // Authentication endpoints
    async login(username, password) {
        return this.request('', {
            body: JSON.stringify({
                action: 'login',
                username,
                password
            })
        });
    }

    async logout() {
        return this.request('', {
            body: JSON.stringify({
                action: 'logout',
                sessionId: this.sessionId
            })
        });
    }

    // Inventory endpoints
    async getInventoryData() {
        return this.request('', {
            body: JSON.stringify({
                action: 'getInventoryData',
                sessionId: this.sessionId
            })
        });
    }

    async addInventoryItem(itemData) {
        return this.request('', {
            body: JSON.stringify({
                action: 'addInventoryItem',
                sessionId: this.sessionId,
                ...itemData
            })
        });
    }

    async updateInventoryItem(itemData) {
        return this.request('', {
            body: JSON.stringify({
                action: 'updateInventoryItem',
                sessionId: this.sessionId,
                ...itemData
            })
        });
    }

    async deleteInventoryItem(itemName) {
        return this.request('', {
            body: JSON.stringify({
                action: 'deleteInventoryItem',
                sessionId: this.sessionId,
                itemName
            })
        });
    }

    async bulkUploadInventory(items) {
        return this.request('', {
            body: JSON.stringify({
                action: 'bulkUploadInventory',
                sessionId: this.sessionId,
                items
            })
        });
    }

    // Sales endpoints
    async submitSaleData(saleData) {
        return this.request('', {
            body: JSON.stringify({
                action: 'submitSaleData',
                sessionId: this.sessionId,
                ...saleData
            })
        });
    }

    async getTodaysSalesBreakdown() {
        return this.request('', {
            body: JSON.stringify({
                action: 'getTodaysSalesBreakdown',
                sessionId: this.sessionId
            })
        });
    }

    // Reports endpoints
    async generateReport(params) {
        return this.request('', {
            body: JSON.stringify({
                action: 'generateReport',
                sessionId: this.sessionId,
                ...params
            })
        });
    }

    // User management endpoints
    async getAllUsernames() {
        return this.request('', {
            body: JSON.stringify({
                action: 'getAllUsernames',
                sessionId: this.sessionId
            })
        });
    }

    async getAllUsers() {
        return this.request('', {
            body: JSON.stringify({
                action: 'getAllUsers',
                sessionId: this.sessionId
            })
        });
    }

    async addUser(userData) {
        return this.request('', {
            body: JSON.stringify({
                action: 'addUser',
                sessionId: this.sessionId,
                ...userData
            })
        });
    }

    async deleteUser(username) {
        return this.request('', {
            body: JSON.stringify({
                action: 'deleteUser',
                sessionId: this.sessionId,
                username
            })
        });
    }

    async changePassword(currentUsername, targetUsername, newPassword, oldPassword, isManager) {
        return this.request('', {
            body: JSON.stringify({
                action: 'changePassword',
                sessionId: this.sessionId,
                currentUsername,
                targetUsername,
                newPassword,
                oldPassword,
                isManager
            })
        });
    }
}

// Initialize API service
const apiService = new GASApiService();

// Replace all google.script.run calls with apiService calls
// For example:
// OLD: google.script.run.withSuccessHandler(...).withFailureHandler(...).getInventoryData();
// NEW: apiService.getInventoryData().then(...).catch(...);

document.addEventListener('DOMContentLoaded', function() {
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
                start: utils.formatDateToYYYYMMDD(startDate),
                end: utils.formatDateToYYYYMMDD(endDate)
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
                utils.showAlert(`Please enter a valid non-negative number for Reorder Level in ${formName}`, 'error');
                return false;
            }
            if (value.trim().toLowerCase() === 'manager') {
                utils.showAlert(`The value "Manager" is not allowed for Reorder Level in ${formName}`, 'error');
                return false;
            }
            return true;
        },

        getDefaultTabForUser(user) {
            return user && user.role === 'Manager' ? 'dashboardSection' : 'salesSection';
        },

        isTabRestricted(tabId) {
            const restrictedTabs = ['dashboardSection', 'inventorySection', 'reportsSection', 'manageUsersSection'];
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
                    uiManager.updatePurchaseSummary();
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
                'settingsSection': 'Settings',
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
                reportsManager.updateReportTypeUI();
            } else if (tabId === 'settingsSection') {
                userManager.loadPasswordForm();
                userManager.loadUserInfo();
            } else if (tabId === 'manageUsersSection') {
                userManager.loadUsers();
            } else if (tabId === 'dashboardSection') {
                dashboardManager.loadDashboard();
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
        },

        updateInventoryButtons() {
            // Handled by CSS
        }
    };

    // Clock and Sync Management
    const clockManager = {
        currentTimeInterval: null,
        lastSyncTime: null,

        init() {
            this.startClock();
            this.updateLastSync();
        },

        startClock() {
            this.updateClock();
            this.currentTimeInterval = setInterval(() => {
                this.updateClock();
            }, 1000);
        },

        updateClock() {
            const now = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            };
            const dateTimeString = now.toLocaleDateString('en-US', options);
            const clockElement = document.getElementById('currentDateTime');
            if (clockElement) {
                clockElement.textContent = dateTimeString;
            }
        },

        updateLastSync() {
            this.lastSyncTime = new Date();
            const timeString = this.lastSyncTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
            const syncElement = document.getElementById('lastSyncTime');
            if (syncElement) {
                syncElement.textContent = timeString;
            }
        },

        stopClock() {
            if (this.currentTimeInterval) {
                clearInterval(this.currentTimeInterval);
            }
        }
    };

    function updateWelcomeMessage(user) {
        const welcomeElement = document.getElementById('welcomeMessage');
        if (welcomeElement && user && user.username) {
            welcomeElement.textContent = `Welcome, ${user.username}`;
        } else if (welcomeElement) {
            welcomeElement.textContent = 'Welcome, User';
        }
    }

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

        initializeApp(user) {
            state.currentUser = user;
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
            
            clockManager.init();
            updateWelcomeMessage(user);
            
            const defaultTab = utils.getDefaultTabForUser(user);
            state.activeTab = defaultTab;
            
            uiManager.updateTabVisibility();
            uiManager.updateInventoryButtons();
            uiManager.showTab(defaultTab);
            
            const today = utils.formatDateToYYYYMMDD(new Date());
            document.getElementById('saleDate').value = today;
            document.getElementById('reportDate').value = today;
            document.getElementById('summaryStartDate').value = today;
            document.getElementById('summaryEndDate').value = today;
            document.getElementById('reportMonth').value = utils.formatDateToYYYYMM(today);
            
            inventoryManager.loadInventory(() => {
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
        }
    };

    // Inventory Management
    const inventoryManager = {
        loadInventory(callback) {
            const tbody = document.getElementById('inventoryTableBody');
            tbody.innerHTML = '<tr><td colspan="7" class="border p-2 text-center"><i class="fa-solid fa-spinner fa-spin text-primary"></i> Loading inventory...</td></tr>';
            
            const loadingTimeout = setTimeout(() => {
                if (tbody.innerHTML.includes('Loading inventory')) {
                    tbody.innerHTML = '<tr><td colspan="7" class="border p-2 text-center"><i class="fa-solid fa-spinner fa-spin text-primary"></i> Loading large inventory...</td></tr>';
                }
            }, 3000);

            // REPLACED: Using API service instead of google.script.run
            apiService.getInventoryData()
                .then(data => {
                    clearTimeout(loadingTimeout);
                    state.inventoryData = data || [];
                    inventoryManager.applyInventoryFilters();
                    callback && callback();
                })
                .catch(error => {
                    clearTimeout(loadingTimeout);
                    console.error('Inventory load error:', error);
                    utils.showAlert('Failed to load inventory: ' + (error.message || 'Unknown error'), 'error');
                    tbody.innerHTML = '<tr><td colspan="7" class="border p-2 text-center">Error loading inventory</td></tr>';
                    callback && callback();
                });
        },

        applyInventoryFilters() {
            const searchQuery = document.getElementById('inventorySearch').value.trim().toLowerCase();
            const statusFilter = document.getElementById('statusFilter').value;
            
            state.filteredInventoryData = state.inventoryData.filter(item => {
                const matchesSearch = !searchQuery || 
                    (item.name && item.name.toLowerCase().includes(searchQuery)) ||
                    (item.cost && item.cost.toString().includes(searchQuery)) ||
                    (item.price && item.price.toString().includes(searchQuery));
                
                const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
                
                return matchesSearch && matchesStatus;
            });
            
            state.totalInventoryPages = Math.ceil(state.filteredInventoryData.length / state.inventoryPageSize);
            state.currentInventoryPage = Math.min(state.currentInventoryPage, Math.max(1, state.totalInventoryPages));
            
            inventoryManager.updateInventoryTable();
            inventoryManager.updatePaginationControls();
            inventoryManager.updateRowCount();
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
                
                const nameTd = document.createElement('td');
                nameTd.className = 'border p-2';
                nameTd.textContent = item.name || '';
                tr.appendChild(nameTd);
                
                const stockTd = document.createElement('td');
                stockTd.className = 'border p-2';
                stockTd.textContent = item.stock ?? 0;
                tr.appendChild(stockTd);
                
                const costTd = document.createElement('td');
                costTd.className = 'border p-2';
                costTd.textContent = `GHC ${(item.cost ?? 0).toFixed(2)}`;
                tr.appendChild(costTd);
                
                const priceTd = document.createElement('td');
                priceTd.className = 'border p-2';
                priceTd.textContent = `GHC ${(item.price ?? 0).toFixed(2)}`;
                tr.appendChild(priceTd);
                
                const dateTd = document.createElement('td');
                dateTd.className = 'border p-2';
                dateTd.textContent = utils.formatDateToYYYYMMDD(item.purchaseDate);
                tr.appendChild(dateTd);
                
                const reorderTd = document.createElement('td');
                reorderTd.className = 'border p-2';
                reorderTd.textContent = item.reorderLevel ?? 0;
                tr.appendChild(reorderTd);
                
                const statusTd = document.createElement('td');
                statusTd.className = 'border p-2';
                const statusSpan = document.createElement('span');
                statusSpan.className = `status-${(item.status || 'In Stock').toLowerCase().replace(' ', '-')}`;
                statusSpan.textContent = item.status || 'In Stock';
                statusTd.appendChild(statusSpan);
                tr.appendChild(statusTd);
                
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
            const fragment = document.createDocumentFragment();
            const maxVisiblePages = 5;
            let startPage = Math.max(1, state.currentInventoryPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(state.totalInventoryPages, startPage + maxVisiblePages - 1);
            
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            const prevButton = document.createElement('button');
            prevButton.className = 'pagination-prev';
            prevButton.disabled = state.currentInventoryPage === 1;
            prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevButton.addEventListener('click', () => {
                if (state.currentInventoryPage > 1) {
                    state.currentInventoryPage--;
                    inventoryManager.updateInventoryTable();
                    inventoryManager.updatePaginationControls();
                }
            });
            fragment.appendChild(prevButton);
            
            if (startPage > 1) {
                const firstPageButton = document.createElement('button');
                firstPageButton.className = 'pagination-page';
                firstPageButton.dataset.page = 1;
                firstPageButton.textContent = '1';
                firstPageButton.addEventListener('click', () => {
                    const page = 1;
                    state.currentInventoryPage = page;
                    inventoryManager.updateInventoryTable();
                    inventoryManager.updatePaginationControls();
                });
                fragment.appendChild(firstPageButton);
                if (startPage > 2) {
                    const dots = document.createElement('span');
                    dots.className = 'page-dots';
                    dots.textContent = '...';
                    fragment.appendChild(dots);
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const pageButton = document.createElement('button');
                pageButton.className = `pagination-page ${i === state.currentInventoryPage ? 'active' : ''}`;
                pageButton.dataset.page = i;
                pageButton.textContent = i;
                pageButton.addEventListener('click', () => {
                    const page = parseInt(pageButton.dataset.page);
                    if (page !== state.currentInventoryPage) {
                        state.currentInventoryPage = page;
                        inventoryManager.updateInventoryTable();
                        inventoryManager.updatePaginationControls();
                    }
                });
                fragment.appendChild(pageButton);
            }
            
            if (endPage < state.totalInventoryPages) {
                if (endPage < state.totalInventoryPages - 1) {
                    const dots = document.createElement('span');
                    dots.className = 'page-dots';
                    dots.textContent = '...';
                    fragment.appendChild(dots);
                }
                const lastPageButton = document.createElement('button');
                lastPageButton.className = 'pagination-page';
                lastPageButton.dataset.page = state.totalInventoryPages;
                lastPageButton.textContent = state.totalInventoryPages;
                lastPageButton.addEventListener('click', () => {
                    const page = state.totalInventoryPages;
                    state.currentInventoryPage = page;
                    inventoryManager.updateInventoryTable();
                    inventoryManager.updatePaginationControls();
                });
                fragment.appendChild(lastPageButton);
            }
            
            const nextButton = document.createElement('button');
            nextButton.className = 'pagination-next';
            nextButton.disabled = state.currentInventoryPage === state.totalInventoryPages;
            nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextButton.addEventListener('click', () => {
                if (state.currentInventoryPage < state.totalInventoryPages) {
                    state.currentInventoryPage++;
                    inventoryManager.updateInventoryTable();
                    inventoryManager.updatePaginationControls();
                }
            });
            fragment.appendChild(nextButton);
            
            paginationContainer.appendChild(fragment);
        },

        updateRowCount() {
            const rowCountElement = document.getElementById('rowCount');
            const totalItems = state.filteredInventoryData.length;
            const startItem = totalItems === 0 ? 0 : (state.currentInventoryPage - 1) * state.inventoryPageSize + 1;
            const endItem = Math.min(state.currentInventoryPage * state.inventoryPageSize, totalItems);
            
            if (totalItems === 0) {
                rowCountElement.textContent = 'No items found';
            } else if (totalItems <= state.inventoryPageSize) {
                rowCountElement.textContent = `Showing ${totalItems} items`;
            } else {
                rowCountElement.textContent = `Showing ${startItem}-${endItem} of ${totalItems} items`;
            }
        }
    };

    // Sales Management
    const salesManager = {
        addItem() {
            const itemName = document.getElementById('itemName').value.trim();
            const quantity = parseInt(document.getElementById('quantity').value);
            const unitPrice = parseFloat(document.getElementById('unitPrice').value);
            const cost = parseFloat(document.getElementById('cost').value) || 0;

            if (!itemName) {
                utils.showAlert('Please enter an item name', 'error');
                return;
            }
            if (isNaN(quantity) || quantity <= 0) {
                utils.showAlert('Please enter a valid quantity', 'error');
                return;
            }
            if (isNaN(unitPrice) || unitPrice <= 0) {
                utils.showAlert('Please enter a valid unit price', 'error');
                return;
            }
            
            const inventoryItem = state.inventoryData.find(item => item.name.toLowerCase() === itemName.toLowerCase());
            if (!inventoryItem) {
                utils.showAlert('Item not found in inventory', 'error');
                return;
            }
            if (inventoryItem.stock < quantity) {
                utils.showAlert(`Insufficient stock for ${itemName}. Available: ${inventoryItem.stock}`, 'error');
                return;
            }
            
            const item = { itemName: inventoryItem.name, quantity, unitPrice, cost };
            state.salesItems.push(item);
            uiManager.updatePurchaseSummary();
            document.getElementById('itemName').value = '';
            document.getElementById('quantity').value = '';
            document.getElementById('unitPrice').value = '';
            document.getElementById('cost').value = '';
            document.getElementById('availableStock').textContent = 'Available: 0';
        },

        submitSale() {
            if (state.salesItems.length === 0) {
                utils.showAlert('No items added to the sale', 'error');
                return;
            }
            
            const saleData = {
                username: state.currentUser.username,
                date: document.getElementById('saleDate').value,
                items: state.salesItems.map(item => ({
                    itemName: item.itemName,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    cost: Number(item.cost) || 0
                })),
                paymentMethod: document.getElementById('paymentMethod').value
            };
            
            document.getElementById('submitSaleButton').disabled = true;
            
            // REPLACED: Using API service instead of google.script.run
            apiService.submitSaleData(saleData)
                .then(response => {
                    document.getElementById('submitSaleButton').disabled = false;
                    if (response.success) {
                        utils.showAlert('Sale recorded successfully', 'success');
                        state.salesItems = [];
                        uiManager.updatePurchaseSummary();
                        inventoryManager.loadInventory(() => {
                            dashboardManager.clearPerformanceCache();
                        });
                    } else {
                        utils.showAlert(response.message || 'Failed to submit sale', 'error');
                    }
                })
                .catch(error => {
                    document.getElementById('submitSaleButton').disabled = false;
                    utils.showAlert('Error submitting sale: ' + (error.message || 'Unknown error'), 'error');
                });
        },

        displayTodaysSalesBreakdown(data) {
            const breakdown = document.getElementById('salesBreakdown');
            const cash = parseFloat(data.cash) || 0;
            const momo = parseFloat(data.momo) || 0;
            const total = cash + momo;
            breakdown.innerHTML = '';
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'breakdown-header';
            
            const titleP = document.createElement('p');
            titleP.className = 'font-bold text-dark';
            titleP.textContent = "Today's Sales Breakdown";
            
            const closeButton = document.createElement('button');
            closeButton.className = 'close-breakdown';
            closeButton.title = 'Close';
            closeButton.innerHTML = '<i class="fa-solid fa-times"></i>';
            closeButton.addEventListener('click', () => {
                breakdown.classList.add('hidden');
            });
            
            headerDiv.appendChild(titleP);
            headerDiv.appendChild(closeButton);
            
            const fragment = document.createDocumentFragment();
            fragment.appendChild(headerDiv);
            
            if (cash === 0 && momo === 0) {
                const noSalesP = document.createElement('p');
                noSalesP.className = 'text-secondary';
                noSalesP.textContent = "No sales recorded for today.";
                fragment.appendChild(noSalesP);
            } else {
                const cashP = document.createElement('p');
                cashP.innerHTML = `Cash Sales <span class="float-right">GHC ${cash.toFixed(2)}</span>`;
                fragment.appendChild(cashP);
                
                const momoP = document.createElement('p');
                momoP.innerHTML = `Momo Sales <span class="float-right">GHC ${momo.toFixed(2)}</span>`;
                fragment.appendChild(momoP);
                
                const totalP = document.createElement('p');
                totalP.className = 'font-bold text-dark grand-total';
                totalP.innerHTML = `Total Sales <span class="float-right">GHC ${total.toFixed(2)}</span>`;
                fragment.appendChild(totalP);
            }
            
            breakdown.appendChild(fragment);
            breakdown.classList.remove('hidden');
        }
    };

    // Continue with the rest of the managers (reportsManager, userManager, etc.)
    // Each manager should be updated to use apiService instead of google.script.run

    // Event Listeners Setup
    function setupEventListeners() {
        // Login
        utils.safeAddEventListener('login', 'submit', async e => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const loginButton = document.getElementById('loginButton');
            const loginError = document.getElementById('loginError');
            const formInputs = document.querySelectorAll('#login input');
            
            if (!username || !password) {
                loginManager.showLoginError('Please enter both username and password', loginError);
                return;
            }
            
            loginButton.disabled = true;
            loginButton.setAttribute('data-loading', 'true');
            loginError.classList.remove('show');
            formInputs.forEach(input => input.disabled = true);
            
            loginError.textContent = '';
            loginError.classList.add('hidden');
            
            try {
                // REPLACED: Using API service instead of google.script.run
                const response = await apiService.login(username, password);
                
                loginButton.disabled = false;
                loginButton.setAttribute('data-loading', 'false');
                formInputs.forEach(input => input.disabled = false);
                
                if (response && response.success) {
                    loginError.classList.add('hidden');
                    loginManager.initializeApp(response.user);
                } else {
                    const errorMsg = response && response.message ? response.message : 'Invalid username or password';
                    loginManager.showLoginError(errorMsg, loginError);
                    document.getElementById('password').focus();
                    document.getElementById('password').select();
                }
            } catch (error) {
                loginButton.disabled = false;
                loginButton.setAttribute('data-loading', 'false');
                formInputs.forEach(input => input.disabled = false);
                
                let errorMessage = 'Login failed. Please try again.';
                if (error && (error.message.includes('spreadsheet') || error.message.includes('server'))) {
                    errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
                } else if (error && (error.message.includes('401') || error.message.includes('403'))) {
                    errorMessage = 'Authentication error. Please contact administrator.';
                } else {
                    errorMessage = 'Login error: ' + (error.message || 'Unknown error occurred');
                }
                
                loginManager.showLoginError(errorMessage, loginError);
                document.getElementById('password').focus();
            }
        });

        // Logout
        utils.safeAddEventListener('logoutButton', 'click', async () => {
            try {
                await apiService.logout();
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                state.currentUser = null;
                state.salesItems = [];
                state.inventoryData = [];
                state.selectedInventoryItem = null;
                state.activeTab = 'dashboardSection';
                clockManager.stopClock();
                document.getElementById('app').classList.add('hidden');
                document.getElementById('loginForm').classList.remove('hidden');
                document.getElementById('login').reset();
                document.getElementById('loginError').classList.add('hidden');
                document.getElementById('salesBreakdown').classList.add('hidden');
                
                // Clear local storage
                localStorage.removeItem('authToken');
                localStorage.removeItem('sessionId');
                
                utils.showAlert('Logged out successfully', 'success');
            }
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

        // Sales
        utils.safeAddEventListener('addItemButton', 'click', salesManager.addItem);
        utils.safeAddEventListener('submitSaleButton', 'click', salesManager.submitSale);
        utils.safeAddEventListener('showSummaryButton', 'click', () => {
            // REPLACED: Using API service
            apiService.getTodaysSalesBreakdown()
                .then(data => {
                    if (data && data.success) {
                        salesManager.displayTodaysSalesBreakdown(data);
                    } else {
                        utils.showAlert(data && data.message ? data.message : 'Failed to load sales breakdown', 'error');
                    }
                })
                .catch(error => {
                    utils.showAlert('Error loading sales breakdown: ' + (error.message || 'Unknown error'), 'error');
                });
        });

        // Continue setting up other event listeners...
        // Update all other google.script.run calls to use apiService
    }

    // Initialize the application
    setupEventListeners();
    
    // Set default dates on load
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('saleDate')) {
        document.getElementById('saleDate').value = today;
    }
});