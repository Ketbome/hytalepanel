// DOM helper
const $ = id => document.getElementById(id);

// Clean ANSI codes from log output
function cleanLog(text) {
  return text
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\[\d*;?\d*m/g, '')
    .replace(/\[0?m/g, '')
    .replace(/\[38;5;\d+m/g, '')
    .replace(/^\d{2}T\d{2}:\d{2}:\d{2}[.\d]*Z?\s*/gm, '')
    .replace(/^\d{4}[-\/]\d{2}[-\/]\d{2}[T ]\d{2}:\d{2}:\d{2}[.\d]*Z?\s*/gm, '')
    .replace(/^\[\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s+\w+\]\s*/gm, '');
}

// Determine log type from content
function getLogType(text) {
  const lower = text.toLowerCase();
  if (lower.includes('error') || lower.includes('failed') || lower.includes('exception')) return 'error';
  if (lower.includes('warn')) return 'warn';
  if (lower.includes('oauth') || lower.includes('user_code') || lower.includes('authorization')) return 'auth';
  if (lower.includes('success') || lower.includes('complete') || lower.includes('started') || lower.includes('initialized')) return 'info';
  return '';
}

// Format uptime from startedAt timestamp
function formatUptime(startedAt) {
  if (!startedAt) return '00:00:00';
  const seconds = Math.floor((Date.now() - new Date(startedAt)) / 1000);
  return [
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60
  ].map(n => String(n).padStart(2, '0')).join(':');
}

// Format seconds to readable time
function formatSec(s) {
  return s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + (s % 60) + 's';
}

// Format file size
function formatSize(bytes) {
  if (bytes === null || bytes === undefined) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'K';
  return (bytes / (1024 * 1024)).toFixed(1) + 'M';
}

// Show toast notification
function showToast(msg, type = '') {
  document.querySelectorAll('.toast').forEach(el => el.remove());
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
