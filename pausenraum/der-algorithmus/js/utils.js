// utils.js — Gemeinsame Helfer, die vorher in mehreren Modulen dupliziert waren.

export function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export function stripQuotes(s) {
  return String(s || '').replace(/^[„"”]/, '').replace(/[“"”]$/, '');
}
