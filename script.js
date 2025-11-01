/* ====================  GLOBALS  ==================== */
const SCRIPT_URL = 'YOUR_WEB_APP_URL_HERE'; // ← Replace with your Apps Script Web App URL
let currentUser = null;

/* ====================  SAFE GOOGLE RUN  ==================== */
function runGoogle(fn) {
  if (typeof google !== 'undefined' && google.script && google.script.run) {
    fn();
  } else {
    console.log('Waiting for Google API...');
    setTimeout(() => runGoogle(fn), 50);
  }
}

/* ====================  SCREEN HELPERS  ==================== */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const screen = document.getElementById(id);
  if (screen) screen.classList.remove('hidden');

  document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-screen="${id.split('-')[0]}"]`);
  if (btn) btn.classList.add('active');
}

/* ====================  LOGIN  ==================== */
document.getElementById('login-form')?.addEventListener('submit', e => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('login-error');

  if (!username || !password) {
    errorEl.textContent = 'Please enter username and password';
    return;
  }

  errorEl.textContent = 'Logging in...';

  runGoogle(() => {
    google.script.run
      .withSuccessHandler(res => {
        if (res.success) {
          currentUser = res.user;
          errorEl.textContent = '';
          showScreen('dashboard');
          loadDashboard();
        } else {
          errorEl.textContent = res.message || 'Login failed';
        }
      })
      .withFailureHandler(err => {
        errorEl.textContent = 'Network error: ' + err.message;
      })
      .login(username, password);
  });
});

/* ====================  LOGOUT  ==================== */
document.getElementById('logout-btn')?.addEventListener('click', () => {
  currentUser = null;
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('login-error').textContent = '';
  showScreen('login-screen');
});

/* ====================  DASHBOARD  ==================== */
async function loadDashboard() {
  runGoogle(() => {
    google.script.run
      .withSuccessHandler(data => {
        if (data.success) {
          const d = data.data;
          document.getElementById('today-sales').textContent = `GHS ${d.todaysSalesAmount}`;
          document.getElementById('today-tx').textContent = d.todaysTransactionCount;
          document.getElementById('inv-value').textContent = `GHS ${d.inventoryValue}`;
          document.getElementById('low-stock').textContent = d.lowStockCount;
        }
      })
      .getDashboardOverview();
  });

  loadRecentSales();
  loadStockAlerts();
}

function loadRecentSales() {
  runGoogle(() => {
    google.script.run
      .withSuccessHandler(res => {
        const container = document.getElementById('recent-sales');
        container.innerHTML = '';
        if (res.success && res.data.length > 0) {
          res.data.forEach(sale => {
            const div = document.createElement('div');
            div.className = 'sale-item';
            div.innerHTML = `
              <strong>${sale.items.map(i => `${i.qty}x ${i.name}`).join(', ')}</strong><br>
              GHS ${sale.total.toFixed(2)} • ${sale.paymentMethod} • ${sale.soldBy}
            `;
            container.appendChild(div);
          });
        } else {
          container.innerHTML = '<p>No recent sales</p>';
        }
      })
      .getRecentSales(5);
  });
}

function loadStockAlerts() {
  runGoogle(() => {
    google.script.run
      .withSuccessHandler(res => {
        const container = document.getElementById('stock-alerts');
        container.innerHTML = '';
        if (res.success && res.data.length > 0) {
          res.data.forEach(alert => {
            const div = document.createElement('div');
            div.className = `alert ${alert.status === 'Out of Stock' ? 'danger' : 'warning'}`;
            div.innerHTML = `<strong>${alert.name}</strong>: ${alert.qty} left`;
            container.appendChild(div);
          });
        } else {
          container.innerHTML = '<p>All items in stock</p>';
        }
      })
      .getStockAlerts(10);
  });
}

/* ====================  NAVIGATION  ==================== */
document.querySelectorAll('.bottom-nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    const screen = btn.getAttribute('data-screen');
    showScreen(screen === 'users' ? 'users' : screen);
    if (screen === 'dashboard') loadDashboard();
  });
});

/* ====================  INITIAL LOAD  ==================== */
document.addEventListener('DOMContentLoaded', () => {
  showScreen('login-screen');
});
