const App = {
    currentUser: null,
    isInitialized: false,
    currentView: 'dashboard',
    inventory: [],
    sales: [],
    notifications: [],
    settings: {
        currency: 'GHS',
        lowStockThreshold: 10,
        enableNotifications: true
    },

    // NEW: Enhanced initialization with authentication
    initializeApp: function() {
        console.log('🚀 Initializing app...');
        
        // Debug current state
        this.debugAuth();
        
        // Check authentication
        this.checkAuthentication();
        
        // Setup UI regardless of auth status
        this.initializeUI();
        this.attachEventListeners();
        
        this.isInitialized = true;
        console.log('✅ App initialized');
    },

    debugAuth: function() {
        console.log('=== AUTH DEBUG ===');
        console.log('Token:', localStorage.getItem('authToken'));
        console.log('User:', localStorage.getItem('currentUser'));
        console.log('URL:', window.location.href);
        console.log('==================');
    },

    checkAuthentication: function() {
        const token = localStorage.getItem('authToken');
        const userStr = localStorage.getItem('currentUser');
        
        if (token && userStr) {
            try {
                this.currentUser = JSON.parse(userStr);
                console.log('✅ User authenticated:', this.currentUser.username);
                this.onUserAuthenticated();
            } catch (e) {
                console.error('❌ Failed to parse user data:', e);
                this.redirectToLogin();
            }
        } else {
            console.log('ℹ️ No user authenticated');
            if (!this.isLoginPage()) {
                console.log('Redirecting to login...');
                this.redirectToLogin();
            }
        }
    },

    isLoginPage: function() {
        return window.location.pathname.includes('login.html') || 
               window.location.pathname.endsWith('login.html') ||
               window.location.search.includes('login');
    },

    redirectToLogin: function() {
        // Don't redirect if we're already on login page
        if (this.isLoginPage()) return;
        
        console.log('🔐 Redirecting to login page');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    },

    onUserAuthenticated: function() {
        console.log('🎯 User authenticated, loading data...');
        
        // Update UI to show user info
        this.updateUIForUser(this.currentUser);
        
        // Load initial data
        this.loadInitialData();
    },

    updateUIForUser: function(user) {
        // Update user display
        const userElements = document.querySelectorAll('[data-user]');
        userElements.forEach(el => {
            el.textContent = user.username;
        });
        
        // Show/hide elements based on role
        if (user.role === 'Staff') {
            const managerElements = document.querySelectorAll('.manager-only, [data-role="manager"]');
            managerElements.forEach(el => el.style.display = 'none');
        }
        
        // Show main content, hide login prompt
        const loginPrompt = document.getElementById('loginPrompt');
        const mainContent = document.getElementById('mainContent');
        
        if (loginPrompt) loginPrompt.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
    },

    loadInitialData: function() {
        console.log('📊 Loading initial data...');
        
        // Load inventory if on inventory page
        if (this.isInventoryPage()) {
            this.loadInventory();
        }
        
        // Load dashboard if on dashboard page
        if (this.isDashboardPage()) {
            this.loadDashboard();
        }
        
        // Load sales if on sales page
        if (this.isSalesPage()) {
            this.loadSalesData();
        }
    },

    isInventoryPage: function() {
        return window.location.pathname.includes('inventory.html') || 
               document.getElementById('inventoryTab');
    },

    isDashboardPage: function() {
        return window.location.pathname.includes('dashboard.html') || 
               window.location.pathname.endsWith('/') ||
               window.location.pathname.endsWith('index.html') ||
               document.getElementById('dashboardTab');
    },

    isSalesPage: function() {
        return window.location.pathname.includes('sales.html') || 
               document.getElementById('salesTab');
    },

    // EXISTING FUNCTIONS (updated with authentication checks)
    initializeUI: function() {
        console.log('Initializing UI components...');
        this.loadSettings();
        this.setupEventListeners();
        this.showTab('dashboard');
        
        // Update any existing UI elements that depend on user
        if (this.currentUser) {
            this.updateUIForUser(this.currentUser);
        }
    },

    attachEventListeners: function() {
        console.log('Attaching event listeners...');
        this.setupNavigation();
        this.setupForms();
        this.setupModals();
    },

    // EXISTING DATA LOADING FUNCTIONS (updated)
    loadInventory: function() {
        if (!this.currentUser) {
            console.log('Cannot load inventory: user not authenticated');
            return;
        }

        console.log('📦 Loading inventory...');
        
        callGAS(
            'getInventoryData',
            {},
            (response) => {
                console.log('✅ Inventory loaded:', response);
                if (response && Array.isArray(response)) {
                    this.inventory = response;
                    this.displayInventory(response);
                } else {
                    console.error('❌ Invalid inventory response:', response);
                    this.showNotification('Failed to load inventory data', 'error');
                }
            },
            (error) => {
                console.error('❌ Failed to load inventory:', error);
                this.handleError(error);
            }
        );
    },

    loadDashboard: function() {
        if (!this.currentUser) {
            console.log('Cannot load dashboard: user not authenticated');
            return;
        }

        console.log('📈 Loading dashboard...');
        
        this.loadTodaySales();
        this.loadRecentSales();
        this.loadPerformanceSummary();
        this.loadStockAlerts();
    },

    loadTodaySales: function() {
        callGAS(
            'getTodaysSalesBreakdown',
            {},
            (response) => {
                console.log('✅ Today sales loaded:', response);
                if (response && response.success) {
                    this.displayTodaySales(response);
                } else {
                    this.fallbackTodaysSales();
                }
            },
            (error) => {
                console.error('❌ Failed to load today sales:', error);
                this.fallbackTodaysSales();
            }
        );
    },

    // REST OF YOUR EXISTING FUNCTIONS - KEEP ALL OF THEM AS THEY WERE

    setupNavigation: function() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = link.getAttribute('data-tab');
                this.showTab(tabName);
            });
        });

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    },

    logout: function() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        this.currentUser = null;
        window.location.href = 'login.html';
    },

    showTab: function(tabName) {
        console.log('Showing tab:', tabName);
        this.currentView = tabName;
        
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(tab => tab.classList.remove('active'));
        
        // Deactivate all nav links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('active'));
        
        // Activate current tab
        const currentTab = document.getElementById(tabName + 'Tab');
        const currentNavLink = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (currentTab) currentTab.classList.add('active');
        if (currentNavLink) currentNavLink.classList.add('active');
        
        // Load tab-specific data
        this.loadTabData(tabName);
    },

    loadTabData: function(tabName) {
        if (!this.currentUser) {
            console.log('Cannot load tab data: user not authenticated');
            return;
        }

        switch(tabName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'inventory':
                this.loadInventory();
                break;
            case 'sales':
                this.loadSalesData();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'users':
                if (this.currentUser.role === 'Manager') {
                    this.loadUsers();
                } else {
                    this.showNotification('Access denied. Manager role required.', 'error');
                    this.showTab('dashboard');
                }
                break;
        }
    },

    setupForms: function() {
        // Add Inventory Form
        const addItemForm = document.getElementById('addItemForm');
        if (addItemForm) {
            addItemForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddItem();
            });
        }

        // Sales Form
        const salesForm = document.getElementById('salesForm');
        if (salesForm) {
            salesForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSale();
            });
        }

        // User Management Forms
        const addUserForm = document.getElementById('addUserForm');
        if (addUserForm) {
            addUserForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddUser();
            });
        }
    },

    setupModals: function() {
        // Modal triggers
        const modalTriggers = document.querySelectorAll('[data-modal]');
        modalTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const modalId = trigger.getAttribute('data-modal');
                this.openModal(modalId);
            });
        });

        // Modal close buttons
        const closeButtons = document.querySelectorAll('.modal-close, .cancel-btn');
        closeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = button.closest('.modal');
                if (modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Close modal on backdrop click
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    },

    openModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    },

    closeModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            
            // Reset form if exists
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    },

    // Data modification functions with authentication
    handleAddItem: function() {
        if (!this.currentUser) {
            this.showNotification('Please login to add items', 'error');
            return;
        }

        const formData = new FormData(document.getElementById('addItemForm'));
        const itemData = {
            name: formData.get('itemName'),
            stock: parseInt(formData.get('stock')),
            cost: parseFloat(formData.get('cost')),
            price: parseFloat(formData.get('price')),
            purchaseDate: formData.get('purchaseDate'),
            reorderLevel: parseInt(formData.get('reorderLevel')),
            username: this.currentUser.username
        };

        callGAS(
            'addInventoryItem',
            itemData,
            (response) => {
                if (response.success) {
                    this.showNotification('Item added successfully!', 'success');
                    this.loadInventory();
                    this.closeModal('addItemModal');
                } else {
                    this.showNotification('Error: ' + response.message, 'error');
                }
            },
            (error) => {
                this.showNotification('Failed to add item: ' + error.message, 'error');
            }
        );
    },

    handleSale: function() {
        if (!this.currentUser) {
            this.showNotification('Please login to record sales', 'error');
            return;
        }

        const saleItems = this.getSaleItemsFromForm();
        if (saleItems.length === 0) {
            this.showNotification('Please add at least one item to the sale', 'error');
            return;
        }

        const saleData = {
            date: new Date().toISOString().split('T')[0],
            items: saleItems,
            paymentMethod: document.getElementById('paymentMethod').value,
            username: this.currentUser.username
        };

        callGAS(
            'submitSaleData',
            saleData,
            (response) => {
                if (response.success) {
                    this.showNotification('Sale recorded successfully! Sale ID: ' + response.saleId, 'success');
                    this.clearSaleForm();
                    this.closeModal('salesModal');
                    this.loadDashboard(); // Refresh dashboard data
                } else {
                    this.showNotification('Error: ' + response.message, 'error');
                }
            },
            (error) => {
                this.showNotification('Failed to record sale: ' + error.message, 'error');
            }
        );
    },

    handleAddUser: function() {
        if (!this.currentUser || this.currentUser.role !== 'Manager') {
            this.showNotification('Only managers can add users', 'error');
            return;
        }

        const formData = new FormData(document.getElementById('addUserForm'));
        const userData = {
            user: {
                username: formData.get('username'),
                password: formData.get('password'),
                role: formData.get('role')
            },
            adminUsername: this.currentUser.username
        };

        callGAS(
            'addUser',
            userData,
            (response) => {
                if (response.success) {
                    this.showNotification('User added successfully!', 'success');
                    this.closeModal('addUserModal');
                    if (this.currentView === 'users') {
                        this.loadUsers();
                    }
                } else {
                    this.showNotification('Error: ' + response.message, 'error');
                }
            },
            (error) => {
                this.showNotification('Failed to add user: ' + error.message, 'error');
            }
        );
    },

    // Display functions
    displayInventory: function(inventory) {
        const tbody = document.querySelector('#inventoryTab tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        inventory.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.stock}</td>
                <td>${this.settings.currency} ${item.cost.toFixed(2)}</td>
                <td>${this.settings.currency} ${item.price.toFixed(2)}</td>
                <td>${item.purchaseDate}</td>
                <td>${item.reorderLevel}</td>
                <td><span class="status-badge ${item.status.toLowerCase().replace(' ', '-')}">${item.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="App.editInventoryItem('${item.name}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="App.deleteInventoryItem('${item.name}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    displayTodaySales: function(salesData) {
        const cashElement = document.getElementById('todayCash');
        const momoElement = document.getElementById('todayMomo');
        const totalElement = document.getElementById('todayTotal');
        
        if (cashElement) cashElement.textContent = `${this.settings.currency} ${salesData.cash}`;
        if (momoElement) momoElement.textContent = `${this.settings.currency} ${salesData.momo}`;
        if (totalElement) totalElement.textContent = `${this.settings.currency} ${salesData.total}`;
    },

    // Additional data loading functions
    loadRecentSales: function() {
        if (!this.currentUser) return;

        callGAS(
            'getRecentSales',
            { limit: 5 },
            (response) => {
                if (response && response.success) {
                    this.displayRecentSales(response.data);
                }
            },
            (error) => {
                console.error('Failed to load recent sales:', error);
            }
        );
    },

    loadPerformanceSummary: function() {
        if (!this.currentUser) return;

        callGAS(
            'getPerformanceSummary',
            { range: 'week' },
            (response) => {
                if (response && response.success) {
                    this.displayPerformanceSummary(response.data);
                }
            },
            (error) => {
                console.error('Failed to load performance summary:', error);
            }
        );
    },

    loadStockAlerts: function() {
        if (!this.currentUser) return;

        callGAS(
            'getStockAlerts',
            { limit: 10 },
            (response) => {
                if (response && response.success) {
                    this.displayStockAlerts(response.data);
                }
            },
            (error) => {
                console.error('Failed to load stock alerts:', error);
            }
        );
    },

    loadSalesData: function() {
        if (!this.currentUser) return;

        // Implementation for loading sales data
        console.log('Loading sales data...');
    },

    loadReports: function() {
        if (!this.currentUser) return;

        // Implementation for loading reports
        console.log('Loading reports...');
    },

    loadUsers: function() {
        if (!this.currentUser || this.currentUser.role !== 'Manager') return;

        callGAS(
            'getAllUsers',
            {},
            (response) => {
                if (response && response.success) {
                    this.displayUsers(response.users);
                }
            },
            (error) => {
                console.error('Failed to load users:', error);
            }
        );
    },

    loadSettings: function() {
        // Load settings from localStorage or use defaults
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    },

    // Utility functions
    getSaleItemsFromForm: function() {
        // Implementation to get sale items from form
        return []; // Placeholder
    },

    clearSaleForm: function() {
        // Implementation to clear sale form
    },

    editInventoryItem: function(itemName) {
        // Implementation for editing inventory item
        console.log('Edit item:', itemName);
    },

    deleteInventoryItem: function(itemName) {
        if (!this.currentUser) {
            this.showNotification('Please login to delete items', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete "${itemName}"?`)) {
            return;
        }

        callGAS(
            'deleteInventoryItem',
            {
                name: itemName,
                username: this.currentUser.username
            },
            (response) => {
                if (response.success) {
                    this.showNotification('Item deleted successfully!', 'success');
                    this.loadInventory();
                } else {
                    this.showNotification('Error: ' + response.message, 'error');
                }
            },
            (error) => {
                this.showNotification('Failed to delete item: ' + error.message, 'error');
            }
        );
    },

    displayRecentSales: function(sales) {
        // Implementation for displaying recent sales
    },

    displayPerformanceSummary: function(data) {
        // Implementation for displaying performance summary
    },

    displayStockAlerts: function(alerts) {
        // Implementation for displaying stock alerts
    },

    displayUsers: function(users) {
        // Implementation for displaying users
    },

    fallbackTodaysSales: function() {
        // Fallback implementation for today's sales
        const fallbackData = {
            cash: '0.00',
            momo: '0.00',
            total: '0.00'
        };
        this.displayTodaySales(fallbackData);
    },

    // Enhanced error handling
    handleError: function(error) {
        console.error('💥 App error:', error);
        
        // Don't show alert for auth errors - we already handle redirects
        if (error.message && error.message.includes('authentication token')) {
            console.log('🔐 Auth error handled');
            return;
        }
        
        // Show user-friendly error for other errors
        this.showNotification(error.message || 'An error occurred', 'error');
    },

    showNotification: function(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Simple notification system - you can enhance this with a proper UI
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            z-index: 10000;
            font-weight: 500;
            max-width: 300px;
        `;
        
        if (type === 'success') {
            notification.style.background = '#10b981';
        } else if (type === 'error') {
            notification.style.background = '#ef4444';
        } else if (type === 'warning') {
            notification.style.background = '#f59e0b';
        } else {
            notification.style.background = '#3b82f6';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    },

    refresh: function() {
        console.log('Refreshing data...');
        if (this.currentUser) {
            this.loadTabData(this.currentView);
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded, initializing app...');
    App.initializeApp();
});

// Global refresh function for buttons
window.refreshData = function() {
    App.refresh();
};

// Global logout function
window.logout = function() {
    App.logout();
};
