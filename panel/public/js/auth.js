// Auth module
const Auth = {
  token: null,
  
  async init() {
    // Check if already authenticated
    const status = await this.checkStatus();
    if (status.authenticated) {
      this.hideLogin();
      return true;
    }
    
    this.showLogin();
    this.checkDefaults();
    this.bindEvents();
    return false;
  },

  bindEvents() {
    const form = $('login-form');
    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        this.login();
      });
    }

    const logoutBtn = $('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
  },

  async checkStatus() {
    try {
      const res = await fetch('/auth/status');
      if (res.ok) {
        return await res.json();
      }
      return { authenticated: false };
    } catch (e) {
      return { authenticated: false };
    }
  },

  async checkDefaults() {
    try {
      const res = await fetch('/auth/check-defaults');
      const data = await res.json();
      if (data.usingDefaults) {
        const warning = $('login-warning');
        if (warning) {
          warning.classList.add('visible');
        }
      }
    } catch (e) {
      // ignore
    }
  },

  async login() {
    const username = $('login-username').value.trim();
    const password = $('login-password').value;
    const errorEl = $('login-error');
    const btn = $('login-btn');

    if (!username || !password) {
      this.showError('Enter username and password');
      return;
    }

    btn.disabled = true;
    btn.textContent = '...';
    errorEl.classList.remove('visible');

    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        this.token = data.token;
        this.hideLogin();
        // Initialize app after successful login
        if (typeof App !== 'undefined') {
          App.init();
        }
      } else {
        this.showError(data.error || 'Login failed');
      }
    } catch (e) {
      this.showError('Connection error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'LOGIN';
    }
  },

  async logout() {
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    this.token = null;
    this.showLogin();
    // Disconnect socket if connected
    if (typeof App !== 'undefined' && App.socket) {
      App.socket.disconnect();
    }
  },

  showError(msg) {
    const errorEl = $('login-error');
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.add('visible');
    }
  },

  showLogin() {
    const loginScreen = $('login-screen');
    const mainContent = $('main-content');
    
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (mainContent) mainContent.classList.add('hidden');
  },

  hideLogin() {
    const loginScreen = $('login-screen');
    const mainContent = $('main-content');
    
    if (loginScreen) loginScreen.classList.add('hidden');
    if (mainContent) mainContent.classList.remove('hidden');
  },

  getToken() {
    return this.token;
  }
};

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', async () => {
  const authenticated = await Auth.init();
  if (authenticated) {
    // App will be initialized by auth success
    App.init();
  }
});
