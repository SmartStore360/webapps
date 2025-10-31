/**
 * SMARTSTORE 360 - MAIN APPLICATION
 * All your original JavaScript logic, now separated into its own file
 */

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
            reportsManager.updateReportTypeUI();
        } else if (tabId === 'changePasswordSection') {
            userManager.loadChangePasswordForm();
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

// Update welcome message based on user role
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

        google.script.run.withSuccessHandler(data => {
            clearTimeout(loadingTimeout);
            state.inventoryData = data || [];
            inventoryManager.applyInventoryFilters();
            callback && callback();
        }).withFailureHandler(error => {
            clearTimeout(loadingTimeout);
            console.error('Inventory load error:', error);
            utils.showAlert('Failed to load inventory: ' + (error.message || 'Unknown error'), 'error');
            tbody.innerHTML = '<tr><td colspan="7" class="border p-2 text-center">Error loading inventory</td></tr>';
            callback && callback();
        }).getInventoryData();
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
                inventoryManager.update