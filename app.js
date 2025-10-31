// Updated app.js initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 SmartStore 360 App Initializing...');
    
    // Test JSONP connection
    setTimeout(() => {
        gasAPI.testConnection()
            .then(data => {
                console.log('🎉 JSONP Connection Successful!', data);
                showSuccessMessage('✅ Backend connected via JSONP!');
                loadInitialData();
            })
            .catch(error => {
                console.error('💥 JSONP Connection failed:', error);
                showErrorMessage('❌ Backend connection failed');
            });
    }, 1000);
    
    console.log('✅ SmartStore 360 App Ready!');
});

async function loadInitialData() {
    try {
        const [products, dashboard] = await Promise.all([
            gasAPI.getProducts(),
            gasAPI.getDashboardData()
        ]);
        
        console.log('📦 Initial data loaded:', { products, dashboard });
        // Render your UI with the data
        
    } catch (error) {
        console.error('❌ Failed to load initial data:', error);
    }
}

function showSuccessMessage(message) {
    const alert = document.createElement('div');
    alert.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: #4CAF50; 
        color: white; padding: 15px; border-radius: 5px; z-index: 1000;
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
    `;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

// Listen for connection events
window.addEventListener('gas-connected', (event) => {
    console.log('🌐 Backend connection event:', event.detail);
});

window.addEventListener('gas-error', (event) => {
    console.error('💥 Backend error event:', event.detail);
});