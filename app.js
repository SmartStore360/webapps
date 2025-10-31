document.addEventListener('DOMContentLoaded', function() {
    // Replace all google.script.run with callGAS from api-connector.js
    // Added loading states: show spinner on calls
    // Better errors: alert with details
    // Session: store user in localStorage
    // Auth: send token from login
    // Retry: add retry logic in callGAS

    const state = {
        currentUser: JSON.parse(localStorage.getItem('currentUser')),
        inventoryData: [],
        selectedInventoryItem: null,
        salesItems: [],
        activeTab: 'dashboardSection',
        deleteCallback: null,
        currentInventoryPage: 1,
        inventoryPageSize: 50,
        totalInventoryPages: 1,
        filteredInventoryData: [],
        token: localStorage.getItem('token')
    };

    // Core Utilities (modified for loading/error)
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
        },

        showLoading(id, show) {
            const el = document.getElementById(id);
            el.innerHTML = show ? '<p class="text-center"><i class="fa-solid fa-spinner fa-spin text-primary"></i> Loading...</p>' : '';
        },

        handleError(error, message) {
            utils.showAlert(message + ': ' + (error.message || 'Unknown'), 'error');
            console.error(error);
        }
    };

    // UI Management (same, with loading additions where needed)
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
        }
    };

    // Clock and Sync (same)
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

    // Update welcome (same)
    function updateWelcomeMessage(user) {
        const welcomeElement = document.getElementById('welcomeMessage');
        if (welcomeElement && user && user.username) {
            welcomeElement.textContent = `Welcome, ${user.username}`;
        } else if (welcomeElement) {
            welcomeElement.textContent = 'Welcome, User';
        }
    }

    // Login (modified for token, localStorage)
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
            localStorage.setItem('currentUser', JSON.stringify(user));
            state.currentUser = user;
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
            
            clockManager.init();
            updateWelcomeMessage(user);
            
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

    // Inventory (modified to use callGAS)
    const inventoryManager = {
        loadInventory(callback) {
            const tbody = document.getElementById('inventoryTableBody');
            utils.showLoading('inventoryTableBody', true);
            
            callGAS('getInventoryData', {}, (data) => {
                state.inventoryData = data || [];
                inventoryManager.applyInventoryFilters();
                callback && callback();
            }, (error) => {
                utils.handleError(error, 'Failed to load inventory');
                tbody.innerHTML = '<tr><td colspan="7" class="border p-2 text-center">Error loading inventory</td></tr>';
                callback && callback();
            });
        },

        applyInventoryFilters() {
            // same
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
            // same
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
            // same
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
            // same
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

    // Sales (modified to use callGAS, add token)
    const salesManager = {
        addItem() {
            // same validation
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
                paymentMethod: document.getElementById('paymentMethod').value,
                token: state.token
            };
            
            document.getElementById('submitSaleButton').disabled = true;
            callGAS('submitSaleData', saleData, (response) => {
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
            }, (error) => {
                document.getElementById('submitSaleButton').disabled = false;
                utils.handleError(error, 'Error submitting sale');
            });
        },

        displayTodaysSalesBreakdown(data) {
            // same
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

    // Reports (modified to use callGAS)
    const reportsManager = {
        updateReportTypeUI() {
            // same
            const reportType = document.getElementById('reportType').value;
            const dailyWeeklyControl = document.getElementById('dailyWeeklyControl');
            const monthlyControl = document.getElementById('monthlyControl');
            const summaryDateRange = document.getElementById('summaryDateRange');
            
            dailyWeeklyControl.classList.add('hidden');
            monthlyControl.classList.add('hidden');
            summaryDateRange.classList.add('hidden');
            
            if (reportType === 'daily' || reportType === 'weekly') {
                dailyWeeklyControl.classList.remove('hidden');
            } else if (reportType === 'monthly') {
                monthlyControl.classList.remove('hidden');
            } else if (reportType === 'summary') {
                summaryDateRange.classList.remove('hidden');
            }
        },

        generateReport(e) {
            e.preventDefault();
            const reportType = document.getElementById('reportType').value;
            const reportsOutput = document.getElementById('reportsOutput');
            utils.showLoading('reportsOutput', true);

            let params = { type: reportType };

            try {
                if (reportType === 'daily') {
                    const reportDate = document.getElementById('reportDate').value;
                    if (!reportDate) {
                        utils.showAlert('Please select a date for daily report', 'error');
                        reportsOutput.innerHTML = '<p class="text-center">Please select a date</p>';
                        return;
                    }
                    params.date = reportDate;
                } else if (reportType === 'weekly') {
                    const reportDate = document.getElementById('reportDate').value;
                    if (!reportDate) {
                        utils.showAlert('Please select a date for weekly report', 'error');
                        reportsOutput.innerHTML = '<p class="text-center">Please select a date</p>';
                        return;
                    }
                    const weekRange = utils.getWeekRange(reportDate);
                    params.start = weekRange.start;
                    params.end = weekRange.end;
                } else if (reportType === 'monthly') {
                    const reportMonth = document.getElementById('reportMonth').value;
                    if (!reportMonth || !reportMonth.match(/^\d{4}-\d{2}$/)) {
                        utils.showAlert('Please select a month for monthly report', 'error');
                        reportsOutput.innerHTML = '<p class="text-center">Please select a month</p>';
                        return;
                    }
                    params.month = reportMonth;
                } else if (reportType === 'summary') {
                    const startDate = document.getElementById('summaryStartDate').value;
                    const endDate = document.getElementById('summaryEndDate').value;
                    if (!startDate || !endDate) {
                        utils.showAlert('Please select both start and end dates for summary report', 'error');
                        reportsOutput.innerHTML = '<p class="text-center">Please select date range</p>';
                        return;
                    }
                    if (new Date(endDate) < new Date(startDate)) {
                        utils.showAlert('End date cannot be before start date', 'error');
                        reportsOutput.innerHTML = '<p class="text-center">Invalid date range</p>';
                        return;
                    }
                    params.startDate = startDate;
                    params.endDate = endDate;
                }

                params.token = state.token;

                callGAS('generateReport', params, (response) => {
                    try {
                        if (!response || !response.success) {
                            throw new Error(response?.message || 'Invalid response from server');
                        }
                        
                        let tableHtml = '';
                        if (reportType === 'summary') {
                            tableHtml = reportsManager.generateSummaryReport(response);
                        } else {
                            tableHtml = reportsManager.generateStandardReport(response, reportType);
                        }
                        
                        reportsOutput.innerHTML = tableHtml;
                    } catch (error) {
                        utils.handleError(error, 'Error rendering report');
                        reportsOutput.innerHTML = '<div class="text-center p-4"><p class="text-error">Error rendering report</p><p class="text-secondary text-sm">' + error.message + '</p></div>';
                    }
                }, (error) => {
                    utils.handleError(error, 'Error generating report');
                    reportsOutput.innerHTML = '<div class="text-center p-4"><p class="text-error">Error generating report</p><p class="text-secondary text-sm">' + (error.message || 'Unknown error') + '</p></div>';
                });
            } catch (error) {
                utils.handleError(error, 'Error in report parameters');
                reportsOutput.innerHTML = '<div class="text-center p-4><p class="text-error">Error in report parameters</p></div>';
            }
        },

        generateSummaryReport(response) {
            // same
            let tableHtml = `
                <div class="mb-4">
                    <h3 class="text-lg font-bold text-dark mb-4">Sales Summary Report</h3>
                    <p class="text-secondary text-sm mb-4">
                        Period: ${document.getElementById('summaryStartDate').value} to ${document.getElementById('summaryEndDate').value}
                    </p>
                </div>
                <div class="table-container">
                    <table class="w-full border">
                        <thead>
                            <tr>
                                <th class="border p-2 bg-primary text-white">Item Name</th>
                                <th class="border p-2 bg-primary text-white">Quantity Sold</th>
                                <th class="border p-2 bg-primary text-white">Total Amount (GHC)</th>
                                <th class="border p-2 bg-primary text-white">Total Profit (GHC)</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            let rows = [];
            if (response.items && response.items.length > 0) {
                response.items.forEach(item => {
                    rows.push(`
                        <tr>
                            <td class="border p-2">${item.itemName}</td>
                            <td class="border p-2 text-center">${item.quantity}</td>
                            <td class="border p-2 text-right">${item.amount.toFixed(2)}</td>
                            <td class="border p-2 text-right">${item.profit.toFixed(2)}</td>
                        </tr>
                    `);
                });
            } else {
                rows.push('<tr><td colspan="4" class="border p-2 text-center">No sales found for this period</td></tr>');
            }
            
            tableHtml += rows.join('');
            tableHtml += `
                        </tbody>
                    </table>
                </div>
                <div class="mt-6 p-4 bg-gray-800 rounded-lg">
                    <h4 class="font-bold text-lg mb-3 text-center text-white">Summary Totals</h4>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div class="bg-blue-900 p-3 rounded">
                            <p class="text-sm text-blue-200">Cash Sales</p>
                            <p class="text-xl font-bold text-white">GHC ${response.totalCash?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div class="bg-green-900 p-3 rounded">
                            <p class="text-sm text-green-200">Momo Sales</p>
                            <p class="text-xl font-bold text-white">GHC ${response.totalMomo?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div class="bg-purple-900 p-3 rounded">
                            <p class="text-sm text-purple-200">Total Sales</p>
                            <p class="text-xl font-bold text-white">GHC ${response.totalAmount?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div class="bg-orange-900 p-3 rounded">
                            <p class="text-sm text-orange-200">Total Profit</p>
                            <p class="text-xl font-bold text-white">GHC ${response.totalProfit?.toFixed(2) || '0.00'}</p>
                        </div>
                    </div>
                </div>
            `;
            return tableHtml;
        },

        generateStandardReport(response, reportType) {
            // same
            let totalCash = 0;
            let totalMomo = 0;
            let totalSales = 0;
            
            const sales = response.sales || [];
            if (sales.length > 0) {
                sales.forEach(sale => {
                    const subtotal = (sale.quantity || 0) * (sale.unitPrice || 0);
                    totalSales += subtotal;
                    
                    if (sale.paymentMethod === 'Cash') {
                        totalCash += subtotal;
                    } else if (sale.paymentMethod === 'Momo') {
                        totalMomo += subtotal;
                    }
                });
            }

            let periodHtml = '';
            if (reportType === 'weekly') {
                const reportDate = document.getElementById('reportDate').value;
                const weekRange = utils.getWeekRange(reportDate);
                periodHtml = `<p class="text-center text-white mb-4">Period: ${weekRange.start} to ${weekRange.end}</p>`;
            }

            const summaryHtml = `
                <div class="mb-6 p-4 bg-gray-800 rounded-lg">
                    <h3 class="font-bold text-center mb-4 text-white text-lg">SALES SUMMARY - ${reportType.toUpperCase()}</h3>
                    ${periodHtml}
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div class="bg-blue-900 p-3 rounded">
                            <p class="text-sm text-blue-200">Cash Sales</p>
                            <p class="text-xl font-bold text-white">GHC ${totalCash.toFixed(2)}</p>
                        </div>
                        <div class="bg-green-900 p-3 rounded">
                            <p class="text-sm text-green-200">Momo Sales</p>
                            <p class="text-xl font-bold text-white">GHC ${totalMomo.toFixed(2)}</p>
                        </div>
                        <div class="bg-purple-900 p-3 rounded">
                            <p class="text-sm text-purple-200">Total Sales</p>
                            <p class="text-xl font-bold text-white">GHC ${totalSales.toFixed(2)}</p>
                        </div>
                        <div class="bg-gray-700 p-3 rounded">
                            <p class="text-sm text-gray-300">Transactions</p>
                            <p class="text-xl font-bold text-white">${sales.length}</p>
                        </div>
                    </div>
                </div>
            `;
            
            let tableHtml = `
                <div class="mb-4">
                    <h3 class="text-lg font-bold text-dark mb-2">${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Sales Report</h3>
                </div>
                ${summaryHtml}
                <div class="table-container">
                    <table class="w-full border">
                        <thead>
                            <tr>
                                <th class="border p-2 bg-primary text-white">Date</th>
                                <th class="border p-2 bg-primary text-white">Item Name</th>
                                <th class="border p-2 bg-primary text-white">Quantity</th>
                                <th class="border p-2 bg-primary text-white">Unit Price (GHC)</th>
                                <th class="border p-2 bg-primary text-white">Subtotal (GHC)</th>
                                <th class="border p-2 bg-primary text-white">Payment Method</th>
                                <th class="border p-2 bg-primary text-white">Sold By</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            let rows = [];
            if (sales.length > 0) {
                sales.forEach(sale => {
                    const unitPrice = Number(sale.unitPrice) || 0;
                    const quantity = Number(sale.quantity) || 0;
                    const subtotal = (quantity * unitPrice).toFixed(2);
                    rows.push(`
                        <tr>
                            <td class="border p-2">${sale.date || 'Unknown'}</td>
                            <td class="border p-2">${sale.itemName || 'Unknown'}</td>
                            <td class="border p-2 text-center">${quantity}</td>
                            <td class="border p-2 text-right">${unitPrice.toFixed(2)}</td>
                            <td class="border p-2 text-right">${subtotal}</td>
                            <td class="border p-2">${sale.paymentMethod || 'Unknown'}</td>
                            <td class="border p-2">${sale.soldBy || 'Unknown'}</td>
                        </tr>
                    `);
                });
            } else {
                rows.push('<tr><td colspan="7" class="border p-2 text-center">No sales found for this period</td></tr>');
            }
            
            tableHtml += rows.join('');
            tableHtml += '</tbody></table></div>';
            return tableHtml;
        }
    };

    // Export (same)
    const exportManager = {
        exportInventory() {
            if (!state.inventoryData || state.inventoryData.length === 0) {
                utils.showAlert('No inventory data to export', 'error');
                return;
            }

            const dataToExport = state.filteredInventoryData && state.filteredInventoryData.length > 0 
                ? state.filteredInventoryData 
                : state.inventoryData;

            const csvContent = this.convertToCSV(dataToExport, [
                { key: 'name', header: 'Item Name' },
                { key: 'stock', header: 'Stock' },
                { key: 'cost', header: 'Cost (GHC)' },
                { key: 'price', header: 'Price (GHC)' },
                { key: 'purchaseDate', header: 'Purchase Date' },
                { key: 'reorderLevel', header: 'Reorder Level' },
                { key: 'status', header: 'Status' }
            ]);

            this.downloadCSV(csvContent, `inventory_export_${this.getCurrentDateString()}.csv`);
            utils.showAlert('Inventory exported successfully', 'success');
        },

        exportReport() {
            const reportsOutput = document.getElementById('reportsOutput');
            if (!reportsOutput) {
                utils.showAlert('Reports output not found', 'error');
                return;
            }

            const tables = reportsOutput.getElementsByTagName('table');
            
            if (tables.length === 0) {
                utils.showAlert('No report data to export. Please generate a report first.', 'error');
                return;
            }

            try {
                const table = tables[0];
                const rows = table.getElementsByTagName('tr');
                
                if (rows.length === 0) {
                    utils.showAlert('No data in the report table', 'error');
                    return;
                }

                const csvData = [];

                const headerCells = rows[0].getElementsByTagName('th');
                const headers = Array.from(headerCells).map(cell => {
                    let text = cell.textContent.trim();
                    text = text.replace(/<[^>]*>/g, '').trim();
                    return text;
                }).filter(header => header !== '');

                if (headers.length === 0) {
                    utils.showAlert('No valid headers found in report', 'error');
                    return;
                }

                csvData.push(headers);

                for (let i = 1; i < rows.length; i++) {
                    const cells = rows[i].getElementsByTagName('td');
                    const rowData = Array.from(cells).map(cell => {
                        let text = cell.textContent.trim();
                        text = text.replace(/<[^>]*>/g, '').trim();
                        return text;
                    }).filter(cell => cell !== '');

                    if (rowData.length > 0 && rowData.some(cell => cell !== '')) {
                        csvData.push(rowData);
                    }
                }

                if (csvData.length <= 1) {
                    utils.showAlert('No data rows found in report', 'error');
                    return;
                }

                const csvContent = csvData.map(row => 
                    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
                ).join('\n');

                const reportType = document.getElementById('reportType').value;
                const filename = `${reportType}_report_${this.getCurrentDateString()}.csv`;
                this.downloadCSV(csvContent, filename);
                utils.showAlert('Report exported successfully', 'success');
            } catch (error) {
                utils.handleError(error, 'Error exporting report');
            }
        },

        convertToCSV(data, columns) {
            // same
            const headers = columns.map(col => col.header);
            const csvRows = [headers.join(',')];

            data.forEach(item => {
                const row = columns.map(col => {
                    let value = item[col.key];
                    if (value === null || value === undefined) value = '';
                    
                    if (col.key === 'purchaseDate' && value) {
                        value = utils.formatDateToYYYYMMDD(value);
                    }
                    
                    const stringValue = String(value);
                    return `"${stringValue.replace(/"/g, '""')}"`;
                });
                csvRows.push(row.join(','));
            });

            return csvRows.join('\n');
        },

        downloadCSV(csvContent, filename) {
            // same
            try {
                const BOM = '\uFEFF';
                const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                setTimeout(() => URL.revokeObjectURL(url), 100);
            } catch (error) {
                utils.handleError(error, 'Error downloading file');
            }
        },

        getCurrentDateString() {
            const now = new Date();
            return now.toISOString().slice(0, 10).replace(/-/g, '');
        }
    };

    // Dashboard (modified to use callGAS)
    const dashboardManager = {
        performanceCache: {
            data: null,
            timestamp: null,
            cacheDuration: 30000 
        },

        loadDashboard() {
            if (state.currentUser?.role !== 'Manager') {
                utils.showAlert('Access denied. Dashboard is for managers only.', 'error');
                uiManager.showTab('salesSection');
                return;
            }
            
            this.loadTodaySales();
            this.loadInventoryMetrics();
            this.loadStockAlerts();
            this.loadRecentSales();
            this.loadPerformanceSummary();
        },

        loadTodaySales() {
            const today = utils.formatDateToYYYYMMDD(new Date());
            
            callGAS('generateReport', { type: 'daily', date: today, token: state.token }, (reportData) => {
                let totalCash = 0;
                let totalMomo = 0;
                let transactionCount = 0;
                
                if (reportData && reportData.success) {
                    if (reportData.sales && Array.isArray(reportData.sales)) {
                        reportData.sales.forEach(sale => {
                            const subtotal = (sale.quantity || 0) * (sale.unitPrice || 0);
                            
                            if (sale.paymentMethod === 'Cash') {
                                totalCash += subtotal;
                            } else if (sale.paymentMethod === 'Momo') {
                                totalMomo += subtotal;
                            }
                            
                            transactionCount++;
                        });
                    }
                    
                    const total = totalCash + totalMomo;
                    
                    document.getElementById('todaySales').textContent = `GHC ${total.toFixed(2)}`;
                    document.getElementById('todaySalesCount').textContent = 
                        `${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}`;
                } else {
                    this.fallbackTodaysSales();
                }
            }, (error) => {
                utils.handleError(error, 'Daily report error');
                this.fallbackTodaysSales();
            });
        },

        fallbackTodaysSales() {
            callGAS('getTodaysSalesBreakdown', { token: state.token }, (data) => {
                if (data && data.success) {
                    const cash = parseFloat(data.cash) || 0;
                    const momo = parseFloat(data.momo) || 0;
                    const total = cash + momo;
                    const transactionCount = data.transactionCount || 0;
                    
                    document.getElementById('todaySales').textContent = `GHC ${total.toFixed(2)}`;
                    document.getElementById('todaySalesCount').textContent = 
                        `${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}`;
                } else {
                    document.getElementById('todaySales').textContent = 'GHC 0.00';
                    document.getElementById('todaySalesCount').textContent = '0 transactions';
                }
            }, (error) => {
                utils.handleError(error, 'Dashboard sales error');
                document.getElementById('todaySales').textContent = 'GHC 0.00';
                document.getElementById('todaySalesCount').textContent = 'Error loading';
            });
        },

        loadInventoryMetrics() {
            // same, using local state.inventoryData
            const totalValue = state.inventoryData.reduce((sum, item) => sum + (item.stock * item.cost), 0);
            const totalItems = state.inventoryData.length;
            const lowStockItems = state.inventoryData.filter(item => item.status === 'Low Stock').length;
            const outOfStockItems = state.inventoryData.filter(item => item.status === 'Out of Stock').length;

            document.getElementById('inventoryValue').textContent = `GHC ${totalValue.toFixed(2)}`;
            document.getElementById('totalItems').textContent = `${totalItems} items`;
            document.getElementById('lowStockCount').textContent = lowStockItems;
            document.getElementById('outOfStockCount').textContent = outOfStockItems;
        },

        loadStockAlerts() {
            // same
            const alertsContainer = document.getElementById('stockAlerts');
            const lowStockItems = state.inventoryData.filter(item => item.status === 'Low Stock');
            const outOfStockItems = state.inventoryData.filter(item => item.status === 'Out of Stock');

            alertsContainer.innerHTML = '';

            if (outOfStockItems.length === 0 && lowStockItems.length === 0) {
                alertsContainer.innerHTML = `
                    <div class="text-center text-green-600 py-4">
                        <i class="fas fa-check-circle mr-2"></i>
                        All items are properly stocked
                    </div>`;
                return;
            }

            const fragment = document.createDocumentFragment();

            outOfStockItems.slice(0, 5).forEach(item => {
                const alertDiv = document.createElement('div');
                alertDiv.className = 'stock-alert-btn';
                alertDiv.innerHTML = `
                    <div class="btn-content">
                        <div class="btn-icon">
                            <i class="fas fa-times-circle"></i>
                        </div>
                        <div class="btn-text">
                            <div class="btn-title">${item.name}</div>
                            <div class="btn-subtitle">Out of Stock - Urgent</div>
                        </div>
                        <div class="btn-badge">!</div>
                    </div>
                `;
                alertDiv.addEventListener('click', () => uiManager.showTab('inventorySection'));
                fragment.appendChild(alertDiv);
            });

            lowStockItems.slice(0, 5).forEach(item => {
                const alertDiv = document.createElement('div');
                alertDiv.className = 'stock-alert-btn';
                alertDiv.style.borderLeftColor = 'var(--orange)';
                alertDiv.innerHTML = `
                    <div class="btn-content">
                        <div class="btn-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="btn-text">
                            <div class="btn-title">${item.name}</div>
                            <div class="btn-subtitle">Low Stock: ${item.stock} remaining</div>
                        </div>
                    </div>
                `;
                alertDiv.addEventListener('click', () => uiManager.showTab('inventorySection'));
                fragment.appendChild(alertDiv);
            });

            const totalAlerts = outOfStockItems.length + lowStockItems.length;
            if (totalAlerts > 5) {
                const moreDiv = document.createElement('div');
                moreDiv.className = 'text-center pt-2';
                moreDiv.innerHTML = `
                    <span class="text-secondary text-sm">
                        +${totalAlerts - 5} more alert${totalAlerts - 5 !== 1 ? 's' : ''}
                    </span>`;
                fragment.appendChild(moreDiv);
            }

            alertsContainer.appendChild(fragment);
        },

        loadRecentSales() {
            const recentContainer = document.getElementById('recentSales');
            const today = utils.formatDateToYYYYMMDD(new Date());
            
            utils.showLoading('recentSales', true);
            
            callGAS('generateReport', { type: 'daily', date: today, token: state.token }, (data) => {
                recentContainer.innerHTML = '';
                
                if (data && data.success && data.sales && data.sales.length > 0) {
                    const recentSales = data.sales.slice(-5).reverse();
                    
                    recentSales.forEach(sale => {
                        const saleDiv = document.createElement('div');
                        saleDiv.className = 'recent-sale-item';
                        
                        const time = sale.date === today ? 'Today' : new Date(sale.date).toLocaleDateString();
                        const subtotal = (sale.quantity * sale.unitPrice).toFixed(2);
                        
                        saleDiv.innerHTML = `
                            <div class="flex-1">
                                <div class="font-semibold text-dark">${sale.itemName}</div>
                                <div class="text-secondary text-sm">${sale.quantity} × GHC ${sale.unitPrice} • ${time}</div>
                            </div>
                            <div class="text-right">
                                <div class="font-bold text-dark">GHC ${subtotal}</div>
                                <div class="text-secondary text-sm">${sale.paymentMethod}</div>
                            </div>
                        `;
                        recentContainer.appendChild(saleDiv);
                    });
                } else {
                    recentContainer.innerHTML = '<p class="text-center text-secondary py-4">No recent sales today</p>';
                }
            }, (error) => {
                utils.handleError(error, 'Recent sales error');
                recentContainer.innerHTML = '<p class="text-center text-red-600 py-4">Error loading recent sales</p>';
            });
        },

        loadPerformanceSummary() {
            const todayDate = new Date();
            const today = utils.formatDateToYYYYMMDD(todayDate);
            
            document.getElementById('weeklySales').textContent = 'Loading...';
            document.getElementById('monthlySales').textContent = 'Loading...';
            document.getElementById('turnoverRate').textContent = 'Loading...';
            utils.showLoading('topSellingItems', true);

            const weekRange = utils.getWeekRange(today);

            callGAS('generateReport', { 
                type: 'weekly', 
                date: today,
                token: state.token
            }, (weeklyReport) => {
                let weeklyTotal = 0;
                
                if (weeklyReport && weeklyReport.success) {
                    if (weeklyReport.sales && Array.isArray(weeklyReport.sales)) {
                        weeklyReport.sales.forEach(sale => {
                            const subtotal = (sale.quantity || 0) * (sale.unitPrice || 0);
                            weeklyTotal += subtotal;
                        });
                    }
                    
                    document.getElementById('weeklySales').textContent = 
                        `GHC ${weeklyTotal.toFixed(2)}`;
                    
                    this.loadRemainingPerformanceData(weeklyTotal);
                } else {
                    this.loadRemainingPerformanceData(0);
                }
            }, (error) => {
                this.loadRemainingPerformanceData(0);
            });
        },

        loadRemainingPerformanceData(weeklyTotal) {
            const month = utils.formatDateToYYYYMM(new Date());
            
            callGAS('generateReport', { type: 'monthly', month: month, token: state.token }, (monthlyReport) => {
                let monthlyTotal = 0;
                
                if (monthlyReport && monthlyReport.success && monthlyReport.sales) {
                    monthlyReport.sales.forEach(sale => {
                        const subtotal = (sale.quantity || 0) * (sale.unitPrice || 0);
                        monthlyTotal += subtotal;
                    });
                }
                
                document.getElementById('monthlySales').textContent = 
                    `GHC ${monthlyTotal.toFixed(2)}`;
                
                this.calculateInventoryTurnover(weeklyTotal, monthlyTotal);
                
                this.loadTopSellingItems();
            }, (error) => {
                document.getElementById('monthlySales').textContent = 'GHC 0.00';
                this.calculateInventoryTurnover(weeklyTotal, 0);
                this.loadTopSellingItems();
            });
        },

        calculateInventoryTurnover(weeklySales, monthlySales) {
            try {
                const totalInventoryValue = state.inventoryData.reduce((sum, item) => 
                    sum + (item.stock * item.cost), 0);
                
                let turnoverRate = 0;
                if (totalInventoryValue > 0) {
                    turnoverRate = (weeklySales / totalInventoryValue) * 100;
                }
                
                document.getElementById('turnoverRate').textContent = 
                    `${Math.min(turnoverRate, 100).toFixed(1)}%`;
            } catch (error) {
                utils.handleError(error, 'Turnover calculation error');
                document.getElementById('turnoverRate').textContent = '0%';
            }
        },

        loadTopSellingItems() {
            const today = utils.formatDateToYYYYMMDD(new Date());
            
            callGAS('generateReport', { 
                type: 'weekly', 
                date: today,
                token: state.token
            }, (reportData) => {
                const topItems = [];
                
                if (reportData && reportData.success && reportData.sales) {
                    const itemSales = {};
                    
                    reportData.sales.forEach(sale => {
                        const itemName = sale.itemName || 'Unknown Item';
                        const quantity = Number(sale.quantity) || 0;
                        
                        if (!itemSales[itemName]) {
                            itemSales[itemName] = {
                                name: itemName,
                                quantity: 0
                            };
                        }
                        itemSales[itemName].quantity += quantity;
                    });
                    
                    const sortedItems = Object.values(itemSales)
                        .sort((a, b) => b.quantity - a.quantity)
                        .slice(0, 5);
                        
                    topItems.push(...sortedItems);
                }
                
                this.updateTopSellingItems(topItems);
            }, (error) => {
                utils.handleError(error, 'Top items error');
                this.updateTopSellingItems([]);
            });
        },

        updateTopSellingItems(topItems) {
            const container = document.getElementById('topSellingItems');
            
            if (!topItems || topItems.length === 0) {
                container.innerHTML = '<p class="text-center text-secondary py-2">No sales data available</p>';
                return;
            }

            const fragment = document.createDocumentFragment();
            
            topItems.forEach((item, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'top-item';
                
                itemDiv.innerHTML = `
                    <div class="top-item-rank">${index + 1}</div>
                    <div class="top-item-name">${item.name || 'Unknown Item'}</div>
                    <div class="top-item-qty">${item.quantity || 0} sold</div>
                `;
                
                fragment.appendChild(itemDiv);
            });
            
            container.innerHTML = '';
            container.appendChild(fragment);
        },

        setDefaultPerformanceValues() {
            // same
            document.getElementById('weeklySales').textContent = 'GHC 0.00';
            document.getElementById('monthlySales').textContent = 'GHC 0.00';
            document.getElementById('turnoverRate').textContent = '0%';
            document.getElementById('topSellingItems').innerHTML = '<p class="text-center text-secondary py-2">No data available</p>';
        },

        clearPerformanceCache() {
            this.performanceCache.data = null;
            this.performanceCache.timestamp = null;
        },

        refresh() {
            this.clearPerformanceCache();
            clockManager.updateLastSync();
            utils.showAlert('Refreshing dashboard...', 'success');
            this.loadDashboard();
        }
    };

    // User (modified to use callGAS)
    const userManager = {
        loadChangePasswordForm() {
            const isManager = state.currentUser?.role === 'Manager';
            const userSelectContainer = document.getElementById('userSelectContainer');
            const userSelect = document.getElementById('userSelect');
            const oldPasswordContainer = document.getElementById('oldPasswordContainer');
            
            oldPasswordContainer.classList.toggle('hidden', isManager && userSelect.value !== state.currentUser.username);
            
            if (isManager) {
                callGAS('getAllUsernames', { token: state.token }, (data) => {
                    if (data.success) {
                        userSelect.innerHTML = data.usernames.map(username => 
                            `<option value="${username}" ${username === state.currentUser.username ? 'selected' : ''}>${username}</option>`
                        ).join('');
                        oldPasswordContainer.classList.toggle('hidden', userSelect.value !== state.currentUser.username);
                    } else {
                        utils.showAlert(data.message || 'Failed to load users', 'error');
                    }
                }, (error) => {
                    utils.handleError(error, 'Failed to load users');
                });
                
                userSelect.addEventListener('change', function() {
                    const requiresOldPassword = this.value === state.currentUser.username;
                    oldPasswordContainer.classList.toggle('hidden', !requiresOldPassword);
                    document.getElementById('oldPassword').required = requiresOldPassword;
                });
            }
        },

        loadUsers() {
            const tbody = document.getElementById('usersTable').querySelector('tbody');
            utils.showLoading('usersTable tbody', true);
            
            callGAS('getAllUsers', { token: state.token }, (data) => {
                if (data.success) {
                    tbody.innerHTML = '';
                    const fragment = document.createDocumentFragment();
                    if (!data.users || data.users.length === 0) {
                        const tr = document.createElement('tr');
                        const td = document.createElement('td');
                        td.colSpan = 2;
                        td.className = 'border p-2 text-center';
                        td.textContent = 'No users found.';
                        tr.appendChild(td);
                        fragment.appendChild(tr);
                    } else {
                        data.users.forEach(user => {
                            const tr = document.createElement('tr');
                            const usernameTd = document.createElement('td');
                            usernameTd.className = 'border p-2';
                            usernameTd.textContent = user.username;
                            tr.appendChild(usernameTd);
                            const roleTd = document.createElement('td');
                            roleTd.className = 'border p-2';
                            const span = document.createElement('span');
                            span.className = `px-2 py-1 rounded ${user.role === 'Manager' ? 'bg-primary text-white' : 'bg-neutral text-white'}`;
                            span.textContent = user.role;
                            roleTd.appendChild(span);
                            tr.appendChild(roleTd);
                            fragment.appendChild(tr);
                        });
                    }
                    tbody.appendChild(fragment);
                } else {
                    utils.showAlert(data.message || 'Failed to load users', 'error');
                    tbody.innerHTML = '<tr><td colspan="2" class="border p-2 text-center">Error loading users</td></tr>';
                }
            }, (error) => {
                utils.handleError(error, 'Failed to load users');
                tbody.innerHTML = '<tr><td colspan="2" class="border p-2 text-center">Error loading users</td></tr>';
            });
        }
    };

    // Modal (same, but calls use callGAS)
    const modalManager = {
        setupInventoryModals() {
            utils.safeAddEventListener('addInventoryButton', 'click', () => {
                document.getElementById('addInventoryModal').classList.remove('hidden');
                const today = utils.formatDateToYYYYMMDD(new Date());
                document.getElementById('addPurchaseDate').value = today;
                document.getElementById('addName').focus();
            });

            utils.safeAddEventListener('cancelAddButton', 'click', () => {
                document.getElementById('addInventoryModal').classList.add('hidden');
                document.getElementById('addInventoryForm').reset();
            });

            utils.safeAddEventListener('addInventoryForm', 'submit', function(e) {
                e.preventDefault();
                const reorderLevel = document.getElementById('addReorderLevel').value.trim();
                if (!utils.validateReorderLevel(reorderLevel, 'Add Inventory Form')) return;
                
                const itemData = {
                    name: document.getElementById('addName').value.trim(),
                    stock: parseInt(document.getElementById('addStock').value) || 0,
                    cost: parseFloat(document.getElementById('addCost').value) || 0,
                    price: parseFloat(document.getElementById('addPrice').value) || 0,
                    purchaseDate: document.getElementById('addPurchaseDate').value,
                    reorderLevel: parseInt(reorderLevel) || 0,
                    username: state.currentUser.username,
                    token: state.token
                };
                
                const submitButton = this.querySelector('button[type="submit"]');
                const originalText = submitButton.textContent;
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';
                
                callGAS('addInventoryItem', itemData, (response) => {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                    
                    if (response.success) {
                        utils.showAlert(response.message, 'success');
                        this.reset();
                        document.getElementById('addPurchaseDate').value = utils.formatDateToYYYYMMDD(new Date());
                        document.getElementById('addName').focus();
                        inventoryManager.loadInventory(() => {
                            dashboardManager.clearPerformanceCache();
                        });
                    } else {
                        utils.showAlert(response.message || 'Failed to add item', 'error');
                    }
                }, (error) => {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                    utils.handleError(error, 'Error adding item');
                });
            });

            utils.safeAddEventListener('updateInventoryButton', 'click', () => {
                document.getElementById('editInventoryModal').classList.remove('hidden');
                
                uiManager.setupAutocomplete('editName', 'editNameAutocomplete', 
                    () => state.inventoryData.map(item => item.name).filter(name => name), 
                    (itemName) => {
                        const inventoryItem = state.inventoryData.find(item => item.name === itemName);
                        if (inventoryItem) {
                            document.getElementById('editCurrentStock').value = Number(inventoryItem.stock) || 0;
                            document.getElementById('editAdjustedStock').value = '';
                            document.getElementById('editCost').value = Number(inventoryItem.cost).toFixed(2);
                            document.getElementById('editPrice').value = Number(inventoryItem.price).toFixed(2);
                            document.getElementById('editPurchaseDate').value = utils.formatDateToYYYYMMDD(inventoryItem.purchaseDate);
                            document.getElementById('editReorderLevel').value = Number(inventoryItem.reorderLevel) || 0;
                        }
                    }
                );
                
                document.getElementById('editName').focus();
            });

            utils.safeAddEventListener('cancelEditButton', 'click', () => {
                document.getElementById('editInventoryModal').classList.add('hidden');
                document.getElementById('editInventoryForm').reset();
                state.selectedInventoryItem = null;
            });

            utils.safeAddEventListener('editInventoryForm', 'submit', function(e) {
                e.preventDefault();
                const reorderLevel = document.getElementById('editReorderLevel').value.trim();
                if (!utils.validateReorderLevel(reorderLevel, 'Edit Inventory Form')) return;
                
                const itemName = document.getElementById('editName').value.trim();
                if (!itemName) {
                    utils.showAlert('Please select an item to update', 'error');
                    return;
                }
                
                const inventoryItem = state.inventoryData.find(item => item.name.toLowerCase() === itemName.toLowerCase());
                if (!inventoryItem) {
                    utils.showAlert('Item not found in inventory', 'error');
                    return;
                }
                
                const adjustedStock = document.getElementById('editAdjustedStock').value.trim();
                const itemData = {
                    name: itemName,
                    stock: adjustedStock ? parseInt(adjustedStock) : inventoryItem.stock,
                    cost: parseFloat(document.getElementById('editCost').value) || inventoryItem.cost,
                    price: parseFloat(document.getElementById('editPrice').value) || inventoryItem.price,
                    purchaseDate: document.getElementById('editPurchaseDate').value || inventoryItem.purchaseDate,
                    reorderLevel: parseInt(reorderLevel) || inventoryItem.reorderLevel,
                    username: state.currentUser.username,
                    token: state.token
                };
                
                const submitButton = this.querySelector('button[type="submit"]');
                const originalText = submitButton.textContent;
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
                
                callGAS('updateInventoryItem', itemData, (response) => {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                    
                    if (response.success) {
                        utils.showAlert(response.message, 'success');
                        this.reset();
                        state.selectedInventoryItem = null;
                        inventoryManager.loadInventory(() => {
                            dashboardManager.clearPerformanceCache();
                        });
                        document.getElementById('editName').focus();
                    } else {
                        utils.showAlert(response.message || 'Failed to update item', 'error');
                    }
                }, (error) => {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                    utils.handleError(error, 'Error updating item');
                });
            });

            utils.safeAddEventListener('deleteInventoryButton', 'click', () => {
                if (!state.selectedInventoryItem) {
                    utils.showAlert('Please select an item to delete', 'error');
                    return;
                }
                utils.showConfirmDelete(`Are you sure you want to delete "${state.selectedInventoryItem.name}"?`, () => {
                    callGAS('deleteInventoryItem', { name: state.selectedInventoryItem.name, username: state.currentUser.username, token: state.token }, (response) => {
                        if (response.success) {
                            utils.showAlert(response.message, 'success');
                            inventoryManager.loadInventory(() => {
                                dashboardManager.clearPerformanceCache();
                            });
                            state.selectedInventoryItem = null;
                        } else {
                            utils.showAlert(response.message || 'Failed to delete item', 'error');
                        }
                    }, (error) => {
                        utils.handleError(error, 'Error deleting item');
                    });
                });
            });

            utils.safeAddEventListener('bulkUploadButton', 'click', () => {
                document.getElementById('bulkUploadModal').classList.remove('hidden');
            });

            utils.safeAddEventListener('cancelBulkUploadButton', 'click', () => {
                document.getElementById('bulkUploadModal').classList.add('hidden');
                document.getElementById('bulkUploadForm').reset();
            });

            utils.safeAddEventListener('bulkUploadForm', 'submit', function(e) {
                e.preventDefault();
                const fileInput = document.getElementById('bulkUploadFile');
                const file = fileInput.files[0];
                if (!file) {
                    utils.showAlert('Please select a CSV file', 'error');
                    return;
                }
                
                const submitButton = this.querySelector('button[type="submit"]');
                const originalText = submitButton.textContent;
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const text = e.target.result;
                    const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
                    const items = rows.slice(1).filter(row => row[0]).map(row => ({
                        name: row[0] || '',
                        stock: parseInt(row[1]) || 0,
                        cost: parseFloat(row[2]) || 0,
                        price: parseFloat(row[3]) || 0,
                        purchaseDate: row[4] || '',
                        reorderLevel: parseInt(row[5]) || 0
                    }));
                    const invalidItem = items.find(item => isNaN(item.reorderLevel) || item.reorderLevel < 0 || String(item.reorderLevel).trim().toLowerCase() === 'manager');
                    if (invalidItem) {
                        utils.showAlert('Invalid Reorder Level in CSV. Ensure all values are non-negative numbers and not "Manager".', 'error');
                        submitButton.disabled = false;
                        submitButton.textContent = originalText;
                        return;
                    }
                    const data = { items, username: state.currentUser.username, token: state.token };
                    callGAS('bulkUploadInventory', data, (response) => {
                        submitButton.disabled = false;
                        submitButton.textContent = originalText;
                        if (response.success) {
                            utils.showAlert(response.message, 'success');
                            document.getElementById('bulkUploadModal').classList.add('hidden');
                            document.getElementById('bulkUploadForm').reset();
                            inventoryManager.loadInventory(() => {
                                dashboardManager.clearPerformanceCache();
                            });
                        } else {
                            utils.showAlert(response.message || 'Failed to upload items', 'error');
                        }
                    }, (error) => {
                        submitButton.disabled = false;
                        submitButton.textContent = originalText;
                        utils.handleError(error, 'Error uploading items');
                    });
                };
                reader.readAsText(file);
            });

            utils.safeAddEventListener('InventoryValueButton', 'click', () => {
                const totalWorth = state.inventoryData.reduce((sum, item) => sum + (item.stock * item.cost), 0);
                document.getElementById('InventoryValue').textContent = `GHC ${totalWorth.toFixed(2)}`;
                document.getElementById('InventoryValueModal').classList.remove('hidden');
            });

            utils.safeAddEventListener('closeInventoryValueButton', 'click', () => {
                document.getElementById('InventoryValueModal').classList.add('hidden');
            });

            utils.safeAddEventListener('addUserButton', 'click', () => {
                document.getElementById('addUserModal').classList.remove('hidden');
                document.getElementById('addUsername').focus();
            });

            utils.safeAddEventListener('cancelAddUserButton', 'click', () => {
                document.getElementById('addUserModal').classList.add('hidden');
                document.getElementById('addUserForm').reset();
            });

            utils.safeAddEventListener('addUserForm', 'submit', function(e) {
                e.preventDefault();
                const username = document.getElementById('addUsername').value.trim();
                const password = document.getElementById('addUserPassword').value;
                const role = document.getElementById('addUserRole').value;
                
                if (!username || !password) {
                    utils.showAlert('Please enter both username and password', 'error');
                    return;
                }
                if (username.length < 3) {
                    utils.showAlert('Username must be at least 3 characters long', 'error');
                    return;
                }
                if (password.length < 4) {
                    utils.showAlert('Password must be at least 4 characters long', 'error');
                    return;
                }
                
                const submitButton = this.querySelector('button[type="submit"]');
                const originalText = submitButton.textContent;
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';
                
                const data = { user: { username, password, role }, adminUsername: state.currentUser.username, token: state.token };
                callGAS('addUser', data, (response) => {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                    if (response.success) {
                        utils.showAlert(response.message, 'success');
                        document.getElementById('addUserModal').classList.add('hidden');
                        document.getElementById('addUserForm').reset();
                        userManager.loadUsers();
                    } else {
                        utils.showAlert(response.message || 'Failed to add user', 'error');
                    }
                }, (error) => {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                    utils.handleError(error, 'Error adding user');
                });
            });

            utils.safeAddEventListener('deleteUserButton', 'click', () => {
                document.getElementById('deleteUserModal').classList.remove('hidden');
                
                callGAS('getAllUsernames', { token: state.token }, (data) => {
                    if (data.success) {
                        const usernames = data.usernames.filter(username => username !== state.currentUser.username);
                        uiManager.setupAutocomplete('deleteUsername', 'deleteUsernameAutocomplete', 
                            () => usernames, 
                            (username) => document.getElementById('deleteUsername').value = username
                        );
                    }
                }, (error) => {
                    utils.handleError(error, 'Failed to load usernames');
                });
                
                document.getElementById('deleteUsername').focus();
            });

            utils.safeAddEventListener('cancelDeleteUserButton', 'click', () => {
                document.getElementById('deleteUserModal').classList.add('hidden');
                document.getElementById('deleteUserForm').reset();
            });

            utils.safeAddEventListener('deleteUserForm', 'submit', function(e) {
                e.preventDefault();
                const username = document.getElementById('deleteUsername').value.trim();
                
                if (!username) {
                    utils.showAlert('Please enter a username to delete', 'error');
                    return;
                }
                if (username === state.currentUser.username) {
                    utils.showAlert('You cannot delete your own account', 'error');
                    return;
                }
                
                utils.showConfirmDelete(`Are you sure you want to delete user "${username}"? This action cannot be undone.`, () => {
                    const submitButton = this.querySelector('button[type="submit"]');
                    const originalText = submitButton.textContent;
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
                    
                    const data = { username, adminUsername: state.currentUser.username, token: state.token };
                    callGAS('deleteUser', data, (response) => {
                        submitButton.disabled = false;
                        submitButton.textContent = originalText;
                        if (response.success) {
                            utils.showAlert(response.message, 'success');
                            document.getElementById('deleteUserModal').classList.add('hidden');
                            document.getElementById('deleteUserForm').reset();
                            userManager.loadUsers();
                        } else {
                            utils.showAlert(response.message || 'Failed to delete user', 'error');
                        }
                    }, (error) => {
                        submitButton.disabled = false;
                        submitButton.textContent = originalText;
                        utils.handleError(error, 'Error deleting user');
                    });
                });
            });

            utils.safeAddEventListener('confirmDeleteButton', 'click', () => {
                document.getElementById('confirmDeleteModal').classList.add('hidden');
                state.deleteCallback && state.deleteCallback();
                state.deleteCallback = null;
            });

            utils.safeAddEventListener('cancelDeleteButton', 'click', () => {
                document.getElementById('confirmDeleteModal').classList.add('hidden');
                state.deleteCallback = null;
            });
        },

        populateEditForm(item = null) {
            // same
            const today = utils.formatDateToYYYYMMDD(new Date());
            document.getElementById('editName').value = item?.name || '';
            document.getElementById('editCurrentStock').value = item ? Number(item.stock) || '' : '';
            document.getElementById('editAdjustedStock').value = '';
            document.getElementById('editCost').value = item ? Number(item.cost).toFixed(2) || '' : '';
            document.getElementById('editPrice').value = item ? Number(item.price).toFixed(2) || '' : '';
            document.getElementById('editPurchaseDate').value = utils.formatDateToYYYYMMDD(item?.purchaseDate) || today;
            document.getElementById('editReorderLevel').value = item ? Number(item.reorderLevel) || '' : '';
            document.getElementById('editCurrentStock').disabled = !item;
        }
    };

    // Event Listeners (same, logout clears storage)
    function setupEventListeners() {
        utils.safeAddEventListener('login', 'submit', e => {
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
            
            callGAS('login', { username, password }, (response) => {
                loginButton.disabled = false;
                loginButton.setAttribute('data-loading', 'false');
                formInputs.forEach(input => input.disabled = false);
                
                if (response && response.success) {
                    localStorage.setItem('token', response.token);
                    state.token = response.token;
                    loginError.classList.add('hidden');
                    loginManager.initializeApp(response.user);
                } else {
                    const errorMsg = response && response.message ? response.message : 'Invalid username or password';
                    loginManager.showLoginError(errorMsg, loginError);
                    document.getElementById('password').focus();
                    document.getElementById('password').select();
                }
            }, (error) => {
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
            });
        });

        utils.safeAddEventListener('logoutButton', 'click', () => {
            localStorage.clear();
            state.currentUser = null;
            state.token = null;
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
            utils.showAlert('Logged out successfully', 'success');
        });

        // other listeners same
        utils.safeAddEventListener('menuToggle', 'click', () => {
            document.getElementById('navMenu').classList.toggle('active');
        });

        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                uiManager.showTab(link.getAttribute('data-tab'));
            });
        });

        utils.safeAddEventListener('addItemButton', 'click', salesManager.addItem);
        utils.safeAddEventListener('submitSaleButton', 'click', salesManager.submitSale);
        utils.safeAddEventListener('showSummaryButton', 'click', () => {
            callGAS('getTodaysSalesBreakdown', { token: state.token }, (data) => {
                if (data && data.success) {
                    salesManager.displayTodaysSalesBreakdown(data);
                } else {
                    utils.showAlert(data && data.message ? data.message : 'Failed to load sales breakdown', 'error');
                }
            }, (error) => {
                utils.handleError(error, 'Error loading sales breakdown');
            });
        });

        let searchTimeout;
        utils.safeAddEventListener('inventorySearch', 'input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => inventoryManager.applyInventoryFilters(), 300);
        });
        utils.safeAddEventListener('statusFilter', 'change', () => inventoryManager.applyInventoryFilters());
        utils.safeAddEventListener('refreshInventoryButton', 'click', () => {
            inventoryManager.loadInventory(() => {
                utils.showAlert('Inventory refreshed successfully', 'success');
                dashboardManager.clearPerformanceCache();
            });
        });

        utils.safeAddEventListener('exportInventoryButton', 'click', () => exportManager.exportInventory());
        utils.safeAddEventListener('exportReportButton', 'click', () => exportManager.exportReport());

        utils.safeAddEventListener('quickActionNewSale', 'click', () => uiManager.showTab('salesSection'));
        utils.safeAddEventListener('quickActionViewInventory', 'click', () => {
            if (state.currentUser?.role === 'Manager') {
                uiManager.showTab('inventorySection');
            } else {
                utils.showAlert('Access denied. Inventory section is for managers only.', 'error');
            }
        });
        utils.safeAddEventListener('quickActionViewReports', 'click', () => {
            if (state.currentUser?.role === 'Manager') {
                uiManager.showTab('reportsSection');
            } else {
                utils.showAlert('Access denied. Reports section is for managers only.', 'error');
            }
        });
        utils.safeAddEventListener('refreshDashboard', 'click', () => {
            if (state.currentUser?.role === 'Manager') {
                dashboardManager.refresh();
            } else {
                utils.showAlert('Access denied. Dashboard is for managers only.', 'error');
            }
        });

        utils.safeAddEventListener('reportsForm', 'submit', e => reportsManager.generateReport(e));
        utils.safeAddEventListener('reportType', 'change', () => reportsManager.updateReportTypeUI());

        utils.safeAddEventListener('changePasswordForm', 'submit', e => {
            e.preventDefault();
            const targetUsername = state.currentUser && state.currentUser.role === 'Manager' ? 
                document.getElementById('userSelect').value : 
                (state.currentUser ? state.currentUser.username : '');
            
            const oldPassword = document.getElementById('oldPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;
            
            if (!newPassword || !confirmNewPassword) {
                utils.showAlert('Please enter both new password and confirmation', 'error');
                return;
            }
            if (newPassword !== confirmNewPassword) {
                utils.showAlert('New passwords do not match', 'error');
                return;
            }
            if (newPassword.length < 4) {
                utils.showAlert('New password must be at least 4 characters long', 'error');
                return;
            }
            
            const isManagerChangingOwnPassword = state.currentUser && state.currentUser.role === 'Manager' && targetUsername === state.currentUser.username;
            if (isManagerChangingOwnPassword && !oldPassword) {
                utils.showAlert('Old password is required when changing your own password', 'error');
                return;
            }
            
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Changing Password...';
            
            const data = {
                adminUsername: state.currentUser ? state.currentUser.username : '',
                targetUsername,
                newPassword,
                oldPassword: isManagerChangingOwnPassword ? oldPassword : '',
                isManager: state.currentUser && state.currentUser.role === 'Manager',
                token: state.token
            };
            callGAS('changePassword', data, (response) => {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
                if (response && response.success) {
                    utils.showAlert(response.message, 'success');
                    document.getElementById('changePasswordForm').reset();
                    if (state.currentUser && state.currentUser.role === 'Manager') {
                        document.getElementById('userSelectContainer').classList.remove('hidden');
                        document.getElementById('oldPasswordContainer').classList.add('hidden');
                        document.getElementById('oldPassword').required = false;
                    }
                } else {
                    utils.showAlert(response && response.message ? response.message : 'Failed to change password', 'error');
                }
            }, (error) => {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
                utils.handleError(error, 'Error changing password');
            });
        });

        modalManager.setupInventoryModals();
    }

    // Initialize
    setupEventListeners();
    if (state.currentUser) {
        loginManager.initializeApp(state.currentUser);
    }
});
