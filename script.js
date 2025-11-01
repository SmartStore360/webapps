/* ==================== GLOBALS ==================== */
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwm7kYfZ1q1pY6lZ9m5q7r8t9u0v1w2x3y4z5a6b7c8d9e/exec';
let currentUser = null;

/* ==================== SAFE GOOGLE CALL ==================== */
function runGoogle(fn) {
  if (typeof google !== 'undefined' && google.script && google.script.run) {
    fn();
  } else {
    setTimeout(() => runGoogle(fn), 50);
  }
}

/* ==================== SCREEN HELPERS ==================== */
function showSection(id) {
  document.querySelectorAll('#app > [id$="Section"], #app > .card').forEach(el => el.classList.add('hidden'));
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}
function hideLogin() {
  const login = document.getElementById('loginForm');
  const app = document.getElementById('app');
  if (login) login.classList.add('hidden');
  if (app) app.classList.remove('hidden');
}
function showLogin() {
  const login = document.getElementById('loginForm');
  const app = document.getElementById('app');
  if (login) login.classList.remove('hidden');
  if (app) app.classList.add('hidden');
}

/* ==================== DOM READY ==================== */
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded. Attaching listeners...');

  /* ==================== LOGIN FORM ==================== */
  const loginForm = document.getElementById('login');
  if (!loginForm) {
    console.error('Login form not found! Check ID: login');
    return;
  }

  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorEl = document.getElementById('loginError');

    if (!usernameInput || !passwordInput || !errorEl) {
      console.error('Login inputs missing');
      return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      errorEl.textContent = 'Enter username and password';
      return;
    }

    errorEl.textContent = 'Signing in...';

    runGoogle(() => {
      google.script.run
        .withSuccessHandler(res => {
          if (res.success) {
            currentUser = res.user;
            errorEl.textContent = '';
            hideLogin();
            loadDashboard();
            initNavigation();
            updateTime();
            const welcome = document.getElementById('welcomeMessage');
            if (welcome) welcome.textContent = `Welcome, ${res.user.username}`;
          } else {
            errorEl.textContent = res.message || 'Login failed';
          }
        })
        .withFailureHandler(err => {
          console.error('Login failed:', err);
          errorEl.textContent = 'Connection failed';
        })
        .login(username, password);
    });
  });

  /* ==================== LOGOUT ==================== */
  const logoutBtn = document.getElementById('logoutButton');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      currentUser = null;
      const u = document.getElementById('username');
      const p = document.getElementById('password');
      const e = document.getElementById('loginError');
      if (u) u.value = '';
      if (p) p.value = '';
      if (e) e.textContent = '';
      showLogin();
    });
  }

  /* ==================== NAVIGATION ==================== */
  function initNavigation() {
    document.querySelectorAll('#navMenu a[data-tab]').forEach(link => {
      link.addEventListener('click', ev => {
        ev.preventDefault();
        const tab = link.getAttribute('data-tab');
        showSection(tab);
        const title = document.getElementById('activeTabName');
        if (title) title.textContent = link.textContent.trim();
      });
    });
  }

  /* ==================== DASHBOARD ==================== */
  function loadDashboard() {
    runGoogle(() => {
      google.script.run
        .withSuccessHandler(data => {
          if (!data.success) return;
          const d = data.data;
          const update = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
          };
          update('todaySales', `GHC ${d.todaysSalesAmount.toFixed(2)}`);
          update('todaySalesCount', `${d.todaysTransactionCount} transaction${d.todaysTransactionCount === 1 ? '' : 's'}`);
          update('inventoryValue', `GHC ${d.inventoryValue.toFixed(2)}`);
          update('totalItems', `${d.inventoryItemCount} item${d.inventoryItemCount === 1 ? '' : 's'}`);
          update('lowStockCount', d.lowStockCount);
          update('outOfStockCount', d.outOfStockCount);
          update('lastSyncTime', new Date().toLocaleTimeString());
        })
        .getDashboardOverview();
    });

    loadRecentSales();
    loadStockAlerts();
    loadPerformanceSummary();
  }

  function loadRecentSales() {
    runGoogle(() => {
      google.script.run
        .withSuccessHandler(res => {
          const container = document.getElementById('recentSales');
          if (!container) return;
          container.innerHTML = '';
          if (!res.success || !res.data.length) {
            container.innerHTML = '<p class="text-center text-secondary">No recent sales</p>';
            return;
          }
          res.data.forEach(s => {
            const div = document.createElement('div');
            div.className = 'sale-item p-2 border-b';
            div.innerHTML = `
              <strong>${s.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</strong><br>
              GHC ${s.total.toFixed(2)} • ${s.paymentMethod} • ${s.soldBy}
            `;
            container.appendChild(div);
          });
        })
        .getRecentSales(5);
    });
  }

  function loadStockAlerts() {
    runGoogle(() => {
      google.script.run
        .withSuccessHandler(res => {
          const container = document.getElementById('stockAlerts');
          if (!container) return;
          container.innerHTML = '';
          if (!res.success || !res.data.length) {
            container.innerHTML = '<p class="text-center text-secondary">All items in stock</p>';
            return;
          }
          res.data.forEach(a => {
            const div = document.createElement('div');
            div.className = `p-2 border-b ${a.status === 'Out of Stock' ? 'text-red-400' : 'text-orange-400'}`;
            div.innerHTML = `<strong>${a.name}</strong>: ${a.qty} left`;
            container.appendChild(div);
          });
        })
        .getStockAlerts(10);
    });
  }

  function loadPerformanceSummary() {
    runGoogle(() => {
      google.script.run
        .withSuccessHandler(res => {
          if (!res.success) return;
          const d = res.data;
          const update = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
          };
          update('weeklySales', `GHC ${d.weekSales.toFixed(2)}`);
          update('monthlySales', `GHC ${d.monthSales.toFixed(2)}`);
          update('turnoverRate', `${d.inventoryTurnover.toFixed(1)}%`);

          const top = document.getElementById('topSellingItems');
          if (!top) return;
          top.innerHTML = '';
          if (d.topSellingItems.length === 0) {
            top.innerHTML = '<p class="text-center text-secondary">No data</p>';
            return;
          }
          d.topSellingItems.forEach(it => {
            const li = document.createElement('div');
            li.className = 'flex justify-between';
            li.innerHTML = `<span>${it.name}</span><span>${it.quantity}</span>`;
            top.appendChild(li);
          });
        })
        .getPerformanceSummary();
    });
  }

  /* ==================== TIME ==================== */
  function updateTime() {
    const now = new Date();
    const el = document.getElementById('currentDateTime');
    if (el) el.textContent = now.toLocaleString();
    setTimeout(updateTime, 1000);
  }

  /* ==================== INITIALIZE ==================== */
  showLogin();
  updateTime();

  // Expose globally
  window.loadDashboard = loadDashboard;
  window.initNavigation = initNavigation;
});
