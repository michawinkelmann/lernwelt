// dms.js — Direkt-Nachrichten mit wiederkehrenden NPC-Arcs.
// Threads sind datengetrieben (data/dms.json), Antworten beeinflussen
// das Profil und auch interne NPC-Bindungs-Werte (npcArcs).

import { Store, clamp } from './state.js';
import { getCharacter, avatarSvg } from './characters.js';
import { SFX } from './sound.js';
import { askWarning } from './warnings.js';
import { maybeQueueMicroReflection } from './microreflect.js';

let THREADS = [];

export function initDms(data) {
  THREADS = data.threads || [];
}

export function getAllThreads() { return THREADS; }

// Erfüllt der User die `requires_choice`-Bedingung eines Items?
// Item zeigt nur, wenn die referenzierte frühere Wahl exakt gematcht wurde.
function meetsRequiredChoice(item, thread) {
  const req = item.requires_choice;
  if (!req) return true;
  const taken = Store.data.dmReplies?.[thread.id] || {};
  return taken[req.after_week]?.id === req.id;
}

// Welche Nachrichten in diesem Thread bis zur aktuellen Woche freigeschaltet sind.
// Berücksichtigt zusätzlich `requires_choice` für bedingte Folge-Nachrichten.
export function getVisibleMessages(thread) {
  return (thread.messages || []).filter(m =>
    m.week <= Store.data.currentWeek && meetsRequiredChoice(m, thread));
}

// Welche Antworten-Auswahl noch offen ist (nach welcher Woche, noch nichts gewählt)?
// Reply-Slots mit `requires_choice` werden nur angeboten, wenn die referenzierte
// vorherige Antwort getroffen wurde.
export function getPendingChoice(thread) {
  const replies = thread.replies || [];
  const taken = Store.data.dmReplies?.[thread.id] || {};
  for (const r of replies) {
    if (r.after_week > Store.data.currentWeek) continue;
    if (taken[r.after_week]) continue;
    if (!meetsRequiredChoice(r, thread)) continue;
    return r;
  }
  return null;
}

// Anzahl unbeantworteter Threads (Badge in Bottom-Nav).
export function unreadCount() {
  let n = 0;
  for (const t of THREADS) {
    const visible = getVisibleMessages(t);
    if (!visible.length) continue;
    const seen = Store.data.dmThreads?.[t.id]?.lastSeenCount || 0;
    if (visible.length > seen) n++;
  }
  return n;
}

// Mark thread as seen.
export function markThreadSeen(threadId) {
  if (!Store.data.dmThreads) Store.data.dmThreads = {};
  const t = THREADS.find(x => x.id === threadId);
  if (!t) return;
  const visible = getVisibleMessages(t);
  Store.data.dmThreads[threadId] = { lastSeenCount: visible.length, lastSeenAt: Date.now() };
  Store.save();
}

// Antwort verbuchen + Effekte anwenden.
export function applyReply(threadId, afterWeek, choice) {
  const eff = choice.effect || {};
  const p = Store.data.userProfile;
  if (eff.tags) {
    for (const [k, v] of Object.entries(eff.tags)) {
      p.interests[k] = clamp((p.interests[k] || 0) + v, 0, 1);
    }
  }
  if (eff.mute) {
    if (!p.muted.includes(eff.mute)) p.muted.push(eff.mute);
  }
  // NPC-Arc-Werte.
  for (const k of ['lea_close', 'finn_path', 'mira_close', 'self_aware']) {
    if (typeof eff[k] === 'number') {
      Store.data.npcArcs[k] = (Store.data.npcArcs[k] || 0) + eff[k];
    }
  }
  if (!Store.data.dmReplies[threadId]) Store.data.dmReplies[threadId] = {};
  Store.data.dmReplies[threadId][afterWeek] = { id: choice.id, text: choice.text, ts: Date.now() };
  Store.save();
  // Wendepunkt-spezifische Mikro-Reflexion direkt nach Marc-Antwort.
  if (threadId === 'dm_marc') {
    setTimeout(() => maybeQueueMicroReflection('marc_dm'), 1800);
  }
}

// Rendert die DM-Inbox-Liste.
export function renderDmList(root, onOpenThread) {
  root.innerHTML = '';
  const items = THREADS.map(t => {
    const visible = getVisibleMessages(t);
    if (!visible.length) return null;
    const last = visible[visible.length - 1];
    const seen = Store.data.dmThreads?.[t.id]?.lastSeenCount || 0;
    const unread = visible.length > seen;
    return { thread: t, last, unread, allText: visible.map(m => m.text).join(' ') };
  }).filter(Boolean);

  if (!items.length) {
    root.innerHTML = '<div class="dm-empty"><p class="muted">Noch keine Nachrichten. Spiele weiter.</p></div>';
    return;
  }

  // Suchfeld erscheint ab 4 sichtbaren Threads — vorher überflüssig.
  if (items.length >= 4) {
    const search = document.createElement('div');
    search.className = 'dm-search';
    search.innerHTML = `<input type="search" id="dm-search-input" placeholder="DMs durchsuchen …" aria-label="DMs durchsuchen" />`;
    root.appendChild(search);
    search.querySelector('#dm-search-input').addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      root.querySelectorAll('.dm-row').forEach(row => {
        if (!q) { row.style.display = ''; return; }
        const matches = row.dataset.search?.toLowerCase().includes(q);
        row.style.display = matches ? '' : 'none';
      });
    });
  }

  for (const it of items) {
    const c = getCharacter(it.thread.with);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'dm-row' + (it.unread ? ' unread' : '');
    row.dataset.search = `${it.thread.title} ${c?.name || ''} ${c?.handle || ''} ${it.allText}`;
    row.innerHTML = `
      <div class="dm-avatar">${avatarSvg(c?.avatar || 0)}${isOnline(it.thread.with) ? '<span class="dm-online" aria-label="online"></span>' : ''}</div>
      <div class="dm-meta">
        <div class="dm-name">${escapeHtml(it.thread.title)}${it.unread ? '<span class="dm-badge">neu</span>' : ''}</div>
        <div class="dm-preview">${escapeHtml(truncate(it.last.text, 80))}</div>
      </div>
      <div class="dm-week muted small">W${it.last.week}</div>
    `;
    row.onclick = () => onOpenThread(it.thread);
    root.appendChild(row);
  }
}

// Rendert einen Thread.
export async function renderDmThread(root, thread, onBack) {
  // Threads mit trigger_warning werden vor dem ersten Öffnen gegated —
  // konsistent zu Posts und Gilden.
  if (thread.trigger_warning && !Store.data.dmThreads?.[thread.id]?.warningAccepted) {
    const r = await askWarning(thread.trigger_warning);
    if (!r.show) { onBack && onBack(); return; }
    if (!Store.data.dmThreads) Store.data.dmThreads = {};
    if (!Store.data.dmThreads[thread.id]) Store.data.dmThreads[thread.id] = {};
    Store.data.dmThreads[thread.id].warningAccepted = true;
    Store.save();
  }
  const c = getCharacter(thread.with);
  const visible = getVisibleMessages(thread);
  const pending = getPendingChoice(thread);
  const taken = Store.data.dmReplies?.[thread.id] || {};

  root.innerHTML = `
    <header class="dm-thread-head">
      <button class="dm-back" aria-label="Zurück">←</button>
      <div class="dm-avatar small">${avatarSvg(c?.avatar || 0)}${isOnline(thread.with) ? '<span class="dm-online"></span>' : ''}</div>
      <div>
        <div class="dm-thread-name">${escapeHtml(thread.title)}</div>
        <div class="muted small">${isOnline(thread.with) ? 'online' : 'zuletzt diese Woche'}</div>
      </div>
    </header>
    <div class="dm-thread-body" id="dm-thread-body"></div>
    <div class="dm-thread-input" id="dm-thread-input"></div>
  `;
  root.querySelector('.dm-back').onclick = onBack;

  const body = root.querySelector('#dm-thread-body');
  // Nachrichten in chronologischer Reihenfolge interleavt mit den eigenen Antworten.
  for (const m of visible) {
    const bubble = document.createElement('div');
    bubble.className = 'dm-bubble from-them';
    bubble.innerHTML = `<div class="dm-text">${escapeHtml(m.text)}</div><div class="dm-time muted small">W${m.week}</div>`;
    body.appendChild(bubble);
    // Antwort, die nach dieser Woche fällig war?
    if (taken[m.week]) {
      const myReply = taken[m.week];
      const mine = document.createElement('div');
      mine.className = 'dm-bubble from-me';
      mine.innerHTML = `<div class="dm-text">${escapeHtml(stripQuotes(myReply.text))}</div><div class="dm-time muted small">deine Antwort</div>`;
      body.appendChild(mine);
    }
  }

  const input = root.querySelector('#dm-thread-input');
  if (pending) {
    if (thread.trigger_warning) {
      input.innerHTML = `<div class="dm-warn">Inhaltswarnung — die Antwortoptionen enthalten Sprache aus dem Umfeld dieses Accounts.</div>`;
    }
    const choicesWrap = document.createElement('div');
    choicesWrap.className = 'dm-choices';
    for (const ch of pending.choices) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dm-choice';
      b.textContent = ch.text;
      b.onclick = () => {
        applyReply(thread.id, pending.after_week, ch);
        SFX.dm();
        renderDmThread(root, thread, onBack);
      };
      choicesWrap.appendChild(b);
    }
    input.appendChild(choicesWrap);
  } else {
    input.innerHTML = `<div class="muted small dm-noreply">— Im Moment keine Antwort möglich. Spiele weiter, neue Nachrichten kommen.</div>`;
  }

  body.scrollTop = body.scrollHeight;
  markThreadSeen(thread.id);
}

// Welche Charaktere sind "online"? Deterministisch pro Woche aus dem Seed.
function isOnline(charId) {
  const w = Store.data.currentWeek;
  const seed = Store.data.random_seed || 1;
  // Hash für deterministisches On/Off.
  let h = 0;
  for (const ch of charId + ':' + w + ':' + seed) h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
  return (h >>> 0) % 5 < 2; // ~40% online
}

function stripQuotes(s) {
  return String(s || '').replace(/^[„"”]/, '').replace(/[“"”]$/, '');
}
function truncate(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
