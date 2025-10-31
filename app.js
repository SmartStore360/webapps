// SIMPLE app.js - REPLACE YOUR CURRENT INITIALIZATION
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 SmartStore 360 App Initializing...');
    
    // Test JSONP connection after a short delay
    setTimeout(() => {
        console.log('🔄 Starting JSONP connection test...');
        gasAPI.testConnection()
            .then(data => {
                console.log('🎉 JSONP Connection Successful!', data);
                showSuccessMessage('✅ Backend connected via JSONP!');
                
                // Load initial data
                loadInitialData();
            })
            .catch(error => {
                console.error('💥 JSONP Connection failed:', error);
                showErrorMessage('❌ Backend connection failed: ' + error.message);
            });
    }, 1000);
    
    console.log('✅ SmartStore 360 App Ready!');
});

async function loadInitialData() {
    try {
        console.log('📦 Loading initial data via JSONP...');
        const [products, dashboard] = await Promise.all([
            gasAPI.getProducts(),
            gasAPI.getDashboardData()
        ]);
        
        console.log('📦 Initial data loaded successfully!', { 
            products: products.products.length,
            dashboard: dashboard.summary 
        });
        
        // Update UI with the data
        updateUI(products, dashboard);
        
    } catch (error) {
        console.error('❌ Failed to load initial data:', error);
    }
}

function updateUI(products, dashboard) {
    // Update your UI here
    console.log('🎨 Updating UI with loaded data...');
    
    // Example: Update a products container
    const productsContainer = document.getElementById('products-container');
    if (productsContainer) {
        productsContainer.innerHTML = '<h3>Products (' + products.products.length + ')</h3>';
        products.products.forEach(product => {
            productsContainer.innerHTML += `
                <div class="product">
                    <strong>${product.name}</strong> - $${product.price} 
                    (Stock: ${product.stock})
                </div>
            `;
        });
    }
}

function showSuccessMessage(message) {
    const alert = document.createElement('div');
    alert.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: #4CAF50; 
        color: white; padding: 15px; border-radius: 5px; z-index: 1000;
        font-family: Arial, sans-serif;
    `;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

function showErrorMessage(message) {
    const alert = document.createElement('div');
    alert.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: #f44336; 
        color: white; padding: 15px; border-radius: 5px; z-index: 1000;
        font-family: Arial, sans-serif;
    `;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

// Listen for connection events
window.addEventListener('gas-connected', (event) => {
    console.log('🌐 Backend connection event received:', event.detail);
});

window.addEventListener('gas-error', (event) => {
    console.error('💥 Backend error event received:', event.detail);
});
