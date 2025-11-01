// In your app.js - update the checkAuthentication function
checkAuthentication: function() {
    const userStr = localStorage.getItem('currentUser');
    
    if (userStr) {
        try {
            this.currentUser = JSON.parse(userStr);
            console.log('✅ User authenticated (token bypassed):', this.currentUser.username);
            this.onUserAuthenticated();
        } catch (e) {
            console.error('❌ Failed to parse user data:', e);
            this.redirectToLogin();
        }
    } else {
        console.log('ℹ️ No user data found');
        if (!this.isLoginPage()) {
            console.log('Redirecting to login...');
            this.redirectToLogin();
        }
    }
}
