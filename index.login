<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - SmartStore 360</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .login-container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
        }

        .logo {
            text-align: center;
            margin-bottom: 2rem;
        }

        .logo h1 {
            color: #333;
            font-size: 1.8rem;
            font-weight: 600;
        }

        .logo .subtitle {
            color: #666;
            font-size: 0.9rem;
            margin-top: 0.5rem;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        label {
            display: block;
            margin-bottom: 0.5rem;
            color: #333;
            font-weight: 500;
        }

        input[type="text"],
        input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e5e9;
            border-radius: 5px;
            font-size: 1rem;
            transition: border-color 0.3s;
        }

        input[type="text"]:focus,
        input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
        }

        .login-btn {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .login-btn:hover {
            transform: translateY(-2px);
        }

        .login-btn:active {
            transform: translateY(0);
        }

        .error-message {
            color: #e74c3c;
            text-align: center;
            margin-top: 1rem;
            padding: 10px;
            background: #ffeaea;
            border-radius: 5px;
            display: none;
        }

        .loading {
            display: none;
            text-align: center;
            color: #667eea;
            margin-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <h1>SmartStore 360</h1>
            <div class="subtitle">Inventory Management System</div>
        </div>

        <form id="loginForm">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required placeholder="Enter your username">
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required placeholder="Enter your password">
            </div>

            <button type="submit" class="login-btn">Login</button>
        </form>

        <div id="errorMessage" class="error-message"></div>
        <div id="loading" class="loading">Logging in...</div>
    </div>

    <script src="api-connector.js"></script>
    <script>
        // Login functionality
        function handleLogin(event) {
            event.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('errorMessage');
            const loading = document.getElementById('loading');
            
            // Hide previous errors
            errorMessage.style.display = 'none';
            loading.style.display = 'block';
            
            console.log('🔐 Attempting login for:', username);
            
            callGAS(
                'login',
                { username, password },
                (response) => {
                    loading.style.display = 'none';
                    console.log('📨 Login response:', response);
                    
                    if (response && response.success && response.token) {
                        // Store login data
                        localStorage.setItem('authToken', response.token);
                        localStorage.setItem('currentUser', JSON.stringify(response.user));
                        
                        console.log('✅ Login successful, redirecting...');
                        console.log('Stored token:', response.token);
                        console.log('Stored user:', response.user);
                        
                        // Redirect to main page
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 500);
                        
                    } else {
                        const errorMsg = response ? response.message : 'Login failed';
                        errorMessage.textContent = errorMsg;
                        errorMessage.style.display = 'block';
                        console.error('❌ Login failed:', response);
                    }
                },
                (error) => {
                    loading.style.display = 'none';
                    errorMessage.textContent = 'Login error: ' + error.message;
                    errorMessage.style.display = 'block';
                    console.error('❌ Login error:', error);
                }
            );
        }

        // Check if already logged in
        function checkExistingLogin() {
            const token = localStorage.getItem('authToken');
            const user = localStorage.getItem('currentUser');
            
            if (token && user) {
                console.log('✅ User already logged in, redirecting...');
                window.location.href = 'index.html';
            }
        }

        // Initialize login page
        document.addEventListener('DOMContentLoaded', function() {
            checkExistingLogin();
            
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', handleLogin);
            }
            
            // Debug info
            console.log('🔐 Login page loaded');
            console.log('Token in storage:', localStorage.getItem('authToken'));
            console.log('User in storage:', localStorage.getItem('currentUser'));
        });

        // Helper function to store login data
        function storeLoginData(loginResult) {
            if (loginResult && loginResult.success && loginResult.token && loginResult.user) {
                localStorage.setItem('authToken', loginResult.token);
                localStorage.setItem('currentUser', JSON.stringify(loginResult.user));
                console.log('✅ Login data stored successfully');
                return true;
            }
            return false;
        }
    </script>
</body>
</html>
