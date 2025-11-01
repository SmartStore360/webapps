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
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}
function showLogin() {
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

/* ==================== DOM LOADED ==================== */
document.addEventListener('DOMContentLoaded', () => {
  // Now elements exist

  /* ==================== LOGIN ==================== */
  const loginForm = document.getElementById('login');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      const err = document.getElementById('loginError');

      if (!username || !password) {
        err.textContent = 'Enter username and password';
        return;
      }
      err.textContent = 'Signing in...';

      runGoogle(() => {
        google.script.run
          .withSuccessHandler(res => {
            if (res.success) {
              currentUser = res.user;
              err.textContent = '';
              hideLogin();
              loadDashboard();
              initNavigation();
              updateTime();
              document.getElementById('welcomeMessage').textContent = `Welcome, ${res.user.username}`;
            } else {
              err.textContent = res.message || 'Login failed';
            }
          })
          .withFailureHandler(() => {
            err.textContent = 'Connection failed';
          })
          .login(username, password);
      });
    });
  }

  /* ==================== LOGOUT ==================== */
  document.getElementById('logoutButton')?.addEventListener('click', () => {
    currentUser = null;
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('loginError').textContent = '';
    showLogin();
  });

  /* ==================== NAVIGATION ==================== */
  function initNavigation() {
    document.querySelectorAll('#navMenu a[data-tab]').forEach(link => {
      link.addEventListener('click', ev => {
        ev.preventDefault();
        const tab = link.getAttribute('data-tab');
        showSection(tab);
        document.getElementById('activeTabName').textContent = link.textContent.trim();
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
          document.getElementById('todaySales').textContent = `GHC ${d.todaysSalesAmount.toFixed(2)}`;
          document.getElementById('todaySalesCount').textContent = `${d.todaysTransactionCount} transaction${d.todaysTransactionCount === 1 ? '' : 's'}`;
          document.getElementById('inventoryValue').textContent = `GHC ${d.inventoryValue.toFixed(2)}`;
          document.getElementById('totalItems').textContent = `${d.inventoryItemCount} item${d.inventoryItemCount === 1 ? '' : 's'}`;
          document.getElementById('lowStockCount').textContent = d.lowStockCount;
          document.getElementById('outOfStockCount').textContent = d.outOfStockCount;
          document.getElementById('lastSyncTime').textContent = new Date().toLocaleTimeString();
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
          document.getElementById('weeklySales').textContent = `GHC ${d.weekSales.toFixed(2)}`;
          document.getElementById('monthlySales').textContent = `GHC ${d.monthSales.toFixed(2)}`;
          document.getElementById('turnoverRate').textContent = `${d.inventoryTurnover.toFixed(1)}%`;

          const top = document.getElementById('topSellingItems');
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
    document.getElementById('currentDateTime').textContent = now.toLocaleString();
    setTimeout(updateTime, 1000);
  }

  /* ==================== INITIAL LOAD ==================== */
  showLogin();
  updateTime();

  // Expose for later use
  window.loadDashboard = loadDashboard;
  window.initNavigation = initNavigation;
});
