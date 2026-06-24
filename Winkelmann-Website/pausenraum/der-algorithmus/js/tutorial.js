// tutorial.js — Erst-Erklärungs-Tooltips beim allerersten Feed-Render.

import { Store } from './state.js';

const STEPS = [
  {
    selector: '.post-card .actions',
    text: 'Likes, Kommentare und Shares füttern den Algorithmus. Auch wütende Kommentare gelten als Engagement — das ist genau der Punkt.',
    placement: 'top'
  },
  {
    selector: '.bottombar .navbtn[data-view="dms"]',
    text: 'Hier landen Direkt-Nachrichten von NPCs. Lea, Finn, Mira melden sich im Lauf der Wochen. Deine Antworten verändern, was passiert.',
    placement: 'top'
  },
  {
    selector: '.stories-bar .story-item:first-child',
    text: 'Stories: 24-h-Inhalte. Klick öffnet sie. Nach einer Spielwoche verschwinden sie.',
    placement: 'bottom'
  }
];

export function maybeRunTutorial() {
  if (Store.data.tutorialDone) return;
  setTimeout(() => runTutorial(0), 800);
}

// Expliziter Replay vom Settings-Menü — bypassed alle Bedingungen.
export function forceRunTutorial() {
  Store.data.tutorialDone = false;
  Store.save();
  setTimeout(() => runTutorial(0), 600);
}

// Globaler Esc-Handler — wird beim ersten Tutorial-Schritt registriert,
// beim Abschluss / Schließen wieder entfernt.
let _escHandler = null;

function cleanupStrayTutorialNodes() {
  // Falls aus irgendeinem Grund (Bug, abgebrochener Vorgänger) Tutorial-
  // Elemente im DOM hängen, vor dem nächsten Schritt wegräumen.
  document.querySelectorAll('.tutorial-overlay, .tutorial-spot, .tutorial-tip, .tutorial-tip-center')
    .forEach(el => { try { el.remove(); } catch (e) { /* ignore */ } });
}

function endTutorial() {
  cleanupStrayTutorialNodes();
  if (_escHandler) {
    document.removeEventListener('keydown', _escHandler);
    _escHandler = null;
  }
  Store.data.tutorialDone = true;
  Store.save();
}

// Zentrierter Tip ohne Highlight, falls Target gar nicht (mehr) auffindbar
// ist. So bleibt der Erklärtext sichtbar, der User ist nicht verloren.
function showCenteredFallback(step, idx) {
  const overlay = document.createElement('div');
  // Kein Spotlight im Fallback → Overlay selbst abdunkeln.
  overlay.className = 'tutorial-overlay dim';
  const tip = document.createElement('div');
  tip.className = 'tutorial-tip tutorial-tip-center';
  tip.setAttribute('role', 'dialog');
  tip.setAttribute('aria-modal', 'true');
  tip.innerHTML = `
    <button class="tutorial-close" aria-label="Tutorial schließen" id="tut-close">×</button>
    <p>${escapeHtml(step.text)}</p>
    <div class="tutorial-actions">
      <span class="muted small">Schritt ${idx + 1} von ${STEPS.length}</span>
      <div>
        <button type="button" class="btn btn-ghost btn-small" id="tut-skip">Überspringen</button>
        <button type="button" class="btn btn-primary btn-small" id="tut-next">${idx === STEPS.length - 1 ? 'Verstanden' : 'Weiter'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.appendChild(tip);
  if (!_escHandler) {
    _escHandler = (e) => { if (e.key === 'Escape') { overlay.remove(); tip.remove(); endTutorial(); } };
    document.addEventListener('keydown', _escHandler);
  }
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { overlay.remove(); tip.remove(); endTutorial(); }
  });
  const close = () => { try { overlay.remove(); } catch (e) {} try { tip.remove(); } catch (e) {} };
  tip.querySelector('#tut-next').onclick = () => { close(); runTutorial(idx + 1); };
  tip.querySelector('#tut-skip').onclick = () => { close(); endTutorial(); };
  tip.querySelector('#tut-close').onclick = () => { close(); endTutorial(); };
}

function runTutorial(idx, retry = 0) {
  // Alte Schritte sauber wegräumen, bevor ein neuer angelegt wird.
  cleanupStrayTutorialNodes();

  if (idx >= STEPS.length) {
    endTutorial();
    return;
  }
  const step = STEPS[idx];
  const target = document.querySelector(step.selector);
  // Element nicht (mehr) im DOM, oder noch nicht ausgemessen (rect 0×0).
  // Einmal kurz warten und erneut versuchen — Bottombar/Stories werden
  // teils nach dem Feed-Render asynchron eingehängt.
  let rect = target && target.getBoundingClientRect && target.getBoundingClientRect();
  let visible = rect && rect.width > 0 && rect.height > 0;
  if (!target || !visible) {
    if (retry < 4) {
      setTimeout(() => runTutorial(idx, retry + 1), 250);
      return;
    }
    // Auch nach Retry kein Target → zentrierter Fallback-Tip ohne Highlight,
    // damit der User wenigstens den Erklärtext sieht.
    return showCenteredFallback(step, idx);
  }

  // Target in den sichtbaren Bereich scrollen. Auf breiten Screens ist die
  // Bottombar position:absolute am unteren Ende eines sehr hohen
  // #screen-main — ihr Rect liegt dann weit unterhalb des Viewports.
  // Ohne dieses Scrollen landeten Spot + Tip off-screen ("nur dunkles Overlay").
  try { target.scrollIntoView({ block: 'center', inline: 'center' }); } catch (e) { /* ignore */ }

  const overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';

  const spot = document.createElement('div');
  spot.className = 'tutorial-spot';

  const tip = document.createElement('div');
  tip.className = 'tutorial-tip placement-' + (step.placement || 'top');
  tip.setAttribute('role', 'dialog');
  tip.setAttribute('aria-modal', 'true');
  tip.setAttribute('aria-label', `Tutorial Schritt ${idx + 1} von ${STEPS.length}`);
  tip.innerHTML = `
    <button class="tutorial-close" aria-label="Tutorial schließen" id="tut-close">×</button>
    <p>${escapeHtml(step.text)}</p>
    <div class="tutorial-actions">
      <span class="muted small">Schritt ${idx + 1} von ${STEPS.length}</span>
      <div>
        <button type="button" class="btn btn-ghost btn-small" id="tut-skip">Überspringen</button>
        <button type="button" class="btn btn-primary btn-small" id="tut-next">${idx === STEPS.length - 1 ? 'Verstanden' : 'Weiter'}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(spot);
  document.body.appendChild(tip);

  // Position erst nach dem Scroll-Reflow setzen. Doppeltes rAF, damit
  // scrollIntoView abgeschlossen ist und offsetHeight korrekt misst.
  requestAnimationFrame(() => requestAnimationFrame(() => positionAround(target, spot, tip, step.placement)));

  // Defensives close(): jedes remove() einzeln in try/catch, damit
  // ein bereits detachtes Element die anderen nicht blockiert.
  const close = () => {
    for (const el of [overlay, spot, tip]) {
      try { el.remove(); } catch (e) { /* ignore */ }
    }
  };

  // Esc-Key schließt das Tutorial komplett — nicht weiter, sondern aus.
  if (!_escHandler) {
    _escHandler = (e) => { if (e.key === 'Escape') { close(); endTutorial(); } };
    document.addEventListener('keydown', _escHandler);
  }

  // Backdrop-Klick (auf das dunkle Overlay außerhalb des Tips) schließt
  // das Tutorial. So sind User nicht gefangen, wenn der Tip irgendwo
  // schlecht positioniert sein sollte.
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { close(); endTutorial(); }
  });

  const nextBtn = tip.querySelector('#tut-next');
  const skipBtn = tip.querySelector('#tut-skip');
  const closeBtn = tip.querySelector('#tut-close');
  if (nextBtn) nextBtn.onclick = () => { close(); runTutorial(idx + 1); };
  if (skipBtn) skipBtn.onclick = () => { close(); endTutorial(); };
  if (closeBtn) closeBtn.onclick = () => { close(); endTutorial(); };
}

function positionAround(target, spot, tip, placement) {
  if (!target || !target.getBoundingClientRect) return;
  const rect = target.getBoundingClientRect();
  const pad = 8;
  spot.style.left   = (rect.left - pad) + 'px';
  spot.style.top    = (rect.top - pad) + 'px';
  spot.style.width  = (rect.width + pad * 2) + 'px';
  spot.style.height = (rect.height + pad * 2) + 'px';

  const tipW = 280;
  let tipX = rect.left + rect.width / 2 - tipW / 2;
  if (tipX < 8) tipX = 8;
  if (tipX + tipW > window.innerWidth - 8) tipX = window.innerWidth - tipW - 8;
  tip.style.width = tipW + 'px';
  tip.style.left  = tipX + 'px';

  const tipH = tip.offsetHeight || 160;
  let top;
  if (placement === 'bottom') {
    top = rect.bottom + 18;
  } else {
    top = rect.top - tipH - 18;
    // Wenn nicht genug Platz nach oben (z.B. Target ganz oben am Bildschirm):
    // unten platzieren.
    if (top < 8) top = rect.bottom + 18;
  }
  // Immer in den sichtbaren Bereich klemmen — egal wo das Target sitzt,
  // der Tip mit Erklärtext + Weiter-Button muss sichtbar bleiben.
  const maxTop = window.innerHeight - tipH - 8;
  tip.style.top = Math.max(8, Math.min(top, maxTop)) + 'px';
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
