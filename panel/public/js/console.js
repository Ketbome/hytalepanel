// Console module
const ConsoleManager = {
  el: null,
  history: [],
  visibleCount: 200,
  chunkSize: 100,
  maxHistory: 10000,
  isLoadingMore: false,
  autoScroll: true,

  init(elementId) {
    this.el = $(elementId);
    this.history = [];
    this.visibleCount = 200;
    this.bindControls();
  },

  bindControls() {
    const self = this;
    const clearBtn = $('console-clear');

    // Lazy load on scroll up
    this.el.addEventListener('scroll', function() {
      // Check if scrolled to top
      if (this.scrollTop < 50 && !self.isLoadingMore) {
        self.loadMore();
      }
      // Auto-scroll detection: if user is near bottom, enable auto-scroll
      const nearBottom = this.scrollHeight - this.scrollTop - this.clientHeight < 50;
      self.autoScroll = nearBottom;
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        self.clear();
      });
    }
  },

  loadMore() {
    const totalHistory = this.history.length;
    const currentlyShowing = this.el.children.length;
    
    if (currentlyShowing >= totalHistory) return; // Nothing more to load
    
    this.isLoadingMore = true;
    const oldScrollHeight = this.el.scrollHeight;
    
    // Calculate how many more to show
    const startIdx = Math.max(0, totalHistory - currentlyShowing - this.chunkSize);
    const endIdx = totalHistory - currentlyShowing;
    const toLoad = this.history.slice(startIdx, endIdx);
    
    // Prepend older logs
    const fragment = document.createDocumentFragment();
    toLoad.forEach(log => {
      fragment.appendChild(this.createLogElement(log));
    });
    
    this.el.insertBefore(fragment, this.el.firstChild);
    
    // Maintain scroll position
    this.el.scrollTop = this.el.scrollHeight - oldScrollHeight;
    this.visibleCount += toLoad.length;
    
    setTimeout(() => { this.isLoadingMore = false; }, 100);
  },

  createLogElement(log) {
    const div = document.createElement('div');
    div.className = 'log-line ' + log.type;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = log.timestamp + ' ';

    div.appendChild(timeSpan);
    div.appendChild(document.createTextNode(log.text));
    return div;
  },

  getTimestamp() {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `[${d}/${mo} ${h}:${m}:${s}]`;
  },

  addLog(text, type = '') {
    const timestamp = this.getTimestamp();

    cleanLog(text).split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const log = {
        timestamp,
        text: trimmed,
        type: type || getLogType(trimmed)
      };

      this.history.push(log);
      
      // Append to DOM if we're showing recent logs
      this.el.appendChild(this.createLogElement(log));
    });

    // Trim history if too large
    while (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Trim visible DOM if too large (keep last 500 visible)
    while (this.el.children.length > 500) {
      this.el.removeChild(this.el.firstChild);
    }

    // Auto-scroll to bottom if enabled
    if (this.autoScroll) {
      this.el.scrollTop = this.el.scrollHeight;
    }
  },

  clear() {
    this.history = [];
    this.visibleCount = 200;
    this.el.innerHTML = '';
  }
};
