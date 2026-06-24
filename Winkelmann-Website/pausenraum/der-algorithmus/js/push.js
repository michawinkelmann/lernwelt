// push.js — Fake-Push-Notifications, die mid-Feed hochpoppen.
// Didaktischer Sinn: SuS sollen die Manipulationsmechanik nicht nur lesen,
// sondern selbst spüren.

import { Store } from './state.js';
import { SFX } from './sound.js';
import { showConcept } from './concepts.js';

const TEMPLATES = [
  { id: 'mention_sara',    from: 'Streem', text: 'Sara hat dich in einem Kommentar erwähnt.',         deceptive: true,  week_min: 3 },
  { id: 'streak',          from: 'Streem', text: 'Du bist seit {W} Wochen aktiv — Streak halten!',     deceptive: true,  week_min: 7 },
  { id: 'reactivate',      from: 'Streem', text: '3 neue Aktivitäten warten auf dich.',                deceptive: true,  week_min: 5 },
  { id: 'trending',        from: 'Streem', text: 'Dein Post von letzter Woche bekommt jetzt Schub.',   deceptive: true,  week_min: 8, needs_own_post: true },
  { id: 'finn_typing',     from: 'Streem', text: 'Finn schreibt dir gerade…',                          deceptive: true,  week_min: 8 },
  { id: 'similar_account', from: 'Streem', text: 'Jemand, dem du ähnelst, folgt jetzt einer Gilde.',   deceptive: true,  week_min: 10 },
  { id: 'fomo',            from: 'Streem', text: '12 Personen aus Greifshafen sind gerade online.',    deceptive: true,  week_min: 6 },
  { id: 'badge_ready',     from: 'Streem', text: 'Ein neues Abzeichen ist fast freigeschaltet — bleib dran!', deceptive: true, week_min: 4 }
];

const RATE_LIMIT_WEEKS = 2; // höchstens alle 2 Wochen ein Push.

function pickTemplate() {
  const w = Store.data.currentWeek;
  const seen = Store.data.pushNotificationsSeen || {};
  const hasOwn = (Store.data.ownPosts || []).length > 0;
  const eligible = TEMPLATES.filter(t => {
    if (t.week_min > w) return false;
    if (t.needs_own_post && !hasOwn) return false;
    if (seen[t.id]) return false;
    return true;
  });
  if (!eligible.length) return null;
  // Deterministisch pro Woche, damit es nicht zufällig springt bei Re-Render.
  const idx = (w * 7 + (Store.data.random_seed || 1)) % eligible.length;
  return eligible[idx];
}

let lastShownWeek = -RATE_LIMIT_WEEKS;

export function maybeShowPush() {
  const w = Store.data.currentWeek;
  if (w - lastShownWeek < RATE_LIMIT_WEEKS) return false;
  if (w < 3) return false; // erste Wochen ruhig lassen.
  const t = pickTemplate();
  if (!t) return false;
  lastShownWeek = w;
  showPushBanner(t);
  if (!Store.data.pushNotificationsSeen) Store.data.pushNotificationsSeen = {};
  const firstPush = Object.keys(Store.data.pushNotificationsSeen).length === 0;
  Store.data.pushNotificationsSeen[t.id] = w;
  Store.save();
  // Direkt nach der allerersten Push: kurze Konzept-Karte „Dark Patterns".
  if (firstPush && !Store.data.conceptsSeen?.dark_patterns) {
    setTimeout(() => showConcept('dark_patterns'), 7000);
  }
  return true;
}

function showPushBanner(template) {
  const w = Store.data.currentWeek;
  const text = template.text.replace('{W}', w);
  const banner = document.createElement('div');
  banner.className = 'push-banner';
  banner.setAttribute('role', 'alert');
  banner.innerHTML = `
    <div class="push-app">📱 ${escapeHtml(template.from)}</div>
    <div class="push-body">
      <div class="push-text">${escapeHtml(text)}</div>
      <button class="push-close" aria-label="Schließen">×</button>
    </div>
    <div class="push-disclaimer muted small">${template.deceptive ? 'Das war eine fiktive Notification. Echte Apps senden so etwas, um dich zurückzuholen — meistens, ohne dass etwas Echtes passiert ist.' : ''}</div>
  `;
  document.body.appendChild(banner);
  SFX.toast();
  // Slide-in via Klasse.
  requestAnimationFrame(() => banner.classList.add('in'));
  const close = () => {
    banner.classList.remove('in');
    setTimeout(() => banner.remove(), 280);
    clearTimeout(autoClose);
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  banner.querySelector('.push-close').onclick = close;
  banner.addEventListener('click', e => {
    if (e.target === banner.querySelector('.push-close')) return;
    // Klick auf Banner zeigt den Disclaimer (Reflexionsmoment).
    banner.classList.add('expanded');
  });
  const autoClose = setTimeout(close, 6500);
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
