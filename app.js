// Simple test - add this to your app.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 SmartStore 360 App Initializing...');
    
    // Test the connection with the fixed code
    setTimeout(() => {
        gasAPI.testConnection()
            .then(data => {
                console.log('🎉 SUCCESS! Backend connected:', data);
                showSuccessMessage('Backend connected successfully!');
            })
            .catch(error => {
                console.error('💥 Connection failed:', error);
                showErrorMessage('Backend connection failed. Check console.');
            });
    }, 1000);
    
    console.log('✅ SmartStore 360 App Ready!');
});

function showSuccessMessage(message) {
    // Add a success indicator to your page
    const alert = document.createElement('div');
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 1000;
    `;
    alert.textContent = '✅ ' + message;
    document.body.appendChild(alert);
    
    setTimeout(() => alert.remove(), 5000);
}

function showErrorMessage(message) {
    const alert = document.createElement('div');
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 1000;
    `;
    alert.textContent = '❌ ' + message;
    document.body.appendChild(alert);
    
    setTimeout(() => alert.remove(), 5000);
}