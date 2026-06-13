// modals.js — Konsistente Modal-Mechanik (ESC, Backdrop, Focus-Trap).
// Statt jedes Modul rollt das selbst, nutzen es alle neuen Overlays gleich.

const TRAPPED = [];

function getFocusable(root) {
  return Array.from(root.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.hidden && el.offsetParent !== null);
}

function onKey(e) {
  if (!TRAPPED.length) return;
  const top = TRAPPED[TRAPPED.length - 1];
  if (e.key === 'Escape') { e.preventDefault(); top.close(); return; }
  if (e.key !== 'Tab') return;
  const items = getFocusable(top.el);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
}
document.addEventListener('keydown', onKey, true);

/**
 * Macht ein Overlay-Element zu einem barrierearmen Modal:
 *  - role="dialog" / aria-modal
 *  - ESC schließt
 *  - Klick auf Backdrop schließt (nur direktes Overlay-Target)
 *  - Tab bleibt innerhalb
 *  - vorheriger Fokus wird wiederhergestellt
 */
export function attachModal(overlay, { onClose, initialFocus } = {}) {
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const restoreFocus = document.activeElement;

  const handle = {
    el: overlay,
    close() {
      const idx = TRAPPED.indexOf(handle);
      if (idx >= 0) TRAPPED.splice(idx, 1);
      overlay.removeEventListener('click', onBackdrop);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (restoreFocus && typeof restoreFocus.focus === 'function') {
        try { restoreFocus.focus(); } catch (e) { /* ignore */ }
      }
      if (typeof onClose === 'function') onClose();
    }
  };
  function onBackdrop(e) {
    if (e.target === overlay) handle.close();
  }
  overlay.addEventListener('click', onBackdrop);
  TRAPPED.push(handle);

  // Initialer Fokus auf erstes interaktives Element.
  setTimeout(() => {
    const target = (typeof initialFocus === 'function' ? initialFocus(overlay) : initialFocus)
      || getFocusable(overlay)[0];
    if (target && typeof target.focus === 'function') {
      try { target.focus(); } catch (e) { /* ignore */ }
    }
  }, 30);

  return handle;
}

/**
 * Wie attachModal, aber für statische Overlays aus index.html, die per
 * `hidden` ein-/ausgeblendet statt aus dem DOM entfernt werden
 * (z.B. #why-overlay, #comment-overlay). Sorgt für Fokus-Trap,
 * Fokus-Rückgabe und ESC — der Aufrufer behält sein eigenes Backdrop-
 * und Button-Wiring und ruft handle.release() beim Schließen.
 */
export function trapStaticOverlay(overlay, { onEscape } = {}) {
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const restoreFocus = document.activeElement;

  const handle = {
    el: overlay,
    close() {
      // ESC im globalen Handler ruft close() — delegiert an den Aufrufer.
      if (typeof onEscape === 'function') onEscape();
      else handle.release();
    },
    release() {
      const idx = TRAPPED.indexOf(handle);
      if (idx >= 0) TRAPPED.splice(idx, 1);
      if (restoreFocus && typeof restoreFocus.focus === 'function') {
        try { restoreFocus.focus(); } catch (e) { /* ignore */ }
      }
    }
  };
  TRAPPED.push(handle);
  setTimeout(() => {
    const target = getFocusable(overlay)[0];
    if (target) { try { target.focus(); } catch (e) { /* ignore */ } }
  }, 30);
  return handle;
}
