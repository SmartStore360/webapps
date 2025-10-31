/**
 * SmartStore 360 - Main App
 * SIMPLE TEST VERSION
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 SmartStore 360 App Initializing...');
    
    // Create a simple test UI
    createTestUI();
    
    console.log('✅ SmartStore 360 App Ready!');
});

function createTestUI() {
    const testUI = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h1>🧪 SmartStore 360 - JSONP Test</h1>
            <div style="margin: 10px 0;">
                <button onclick="testConnection()" style="padding: 10px; margin: 5px;">Test Connection</button>
                <button onclick="getProducts()" style="padding: 10px; margin: 5px;">Get Products</button>
                <button onclick="getDashboard()" style="padding: 10px; margin: 5px;">Get Dashboard</button>
            </div>
            <div id="result" style="border: 1px solid #ccc; padding: 15px; margin: 10px 0; min-height: 100px; background: #f9f9f9;"></div>
        </div>
    `;
    
    document.body.innerHTML = testUI;
    
    // Auto-test connection
    setTimeout(testConnection, 1000);
}

async function testConnection() {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<div style="color: blue;">🔄 Testing JSONP connection...</div>';
    
    try {
        const response = await gasAPI.testConnection();
        resultDiv.innerHTML = `
            <div style="color: green;">
                <h3>✅ JSONP Connection Successful!</h3>
                <pre>${JSON.stringify(response, null, 2)}</pre>
            </div>
        `;
    } catch (error) {
        resultDiv.innerHTML = `
            <div style="color: red;">
                <h3>❌ JSONP Connection Failed</h3>
                <p><strong>Error:</strong> ${error.message}</p>
                <p><strong>Details:</strong> Make sure you replaced api-connector.js with JSONP version</p>
            </div>
        `;
    }
}

async function getProducts() {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<div style="color: blue;">🔄 Loading products via JSONP...</div>';
    
    try {
        const response = await gasAPI.getProducts();
        resultDiv.innerHTML = `
            <div style="color: green;">
                <h3>✅ Products Loaded via JSONP!</h3>
                <pre>${JSON.stringify(response, null, 2)}</pre>
            </div>
        `;
    } catch (error) {
        resultDiv.innerHTML = `
            <div style="color: red;">
                <h3>❌ Failed to load products</h3>
                <p><strong>Error:</strong> ${error.message}</p>
            </div>
        `;
    }
}

async function getDashboard() {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<div style="color: blue;">🔄 Loading dashboard via JSONP...</div>';
    
    try {
        const response = await gasAPI.getDashboardData();
        resultDiv.innerHTML = `
            <div style="color: green;">
                <h3>✅ Dashboard Loaded via JSONP!</h3>
                <pre>${JSON.stringify(response, null, 2)}</pre>
            </div>
        `;
    } catch (error) {
        resultDiv.innerHTML = `
            <div style="color: red;">
                <h3>❌ Failed to load dashboard</h3>
                <p><strong>Error:</strong> ${error.message}</p>
            </div>
        `;
    }
}

// Listen for connection events
window.addEventListener('gas-connected', (event) => {
    console.log('🌐 Backend connected:', event.detail);
});

window.addEventListener('gas-error', (event) => {
    console.error('💥 Backend error:', event.detail);
});
