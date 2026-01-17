// Console module
const ConsoleManager = {
  el: null,
  maxLines: 500,

  init(elementId) {
    this.el = $(elementId);
  },

  addLog(text, type = '') {
    cleanLog(text).split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const div = document.createElement('div');
      div.className = 'log-line ' + (type || getLogType(trimmed));
      div.textContent = trimmed;
      this.el.appendChild(div);
    });

    this.el.scrollTop = this.el.scrollHeight;

    // Limit lines
    while (this.el.children.length > this.maxLines) {
      this.el.removeChild(this.el.firstChild);
    }
  },

  clear() {
    this.el.innerHTML = '';
  }
};
