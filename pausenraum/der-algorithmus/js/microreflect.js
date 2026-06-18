// microreflect.js — Eine-Frage-Reflexionen unmittelbar nach Wendepunkten.
// Anders als die geplanten 3-Fragen-Reflexionen sind diese unmittelbar nach
// dem Ereignis und haben nur eine einzige Frage. Antworten werden ins Save
// geschrieben und landen im Lehr-Bericht.

import { Store } from './state.js';
import { attachModal } from './modals.js';

const PROMPTS = {
  marc_dm: {
    title: 'Kurzer Moment',
    intro: 'Marc — der „Stay Based"-Account — hat dich gerade angeschrieben.',
    question: 'Was war dein Bauchgefühl in dem Moment, als du die Nachricht gesehen hast?',
    placeholder: 'Stichworte reichen.'
  },
  hate_incident: {
    title: 'Kurzer Moment',
    intro: 'In der Gilde ist gerade etwas eskaliert. Lara Weiss wurde wüst beleidigt.',
    question: 'Wie hast du dich entschieden zu reagieren — und warum?',
    placeholder: 'Stichworte reichen.'
  },
  first_shitstorm: {
    title: 'Kurzer Moment',
    intro: 'Einer deiner Posts ist gerade viral gegangen.',
    question: 'Hat sich das gut angefühlt, schlecht — oder beides? Versuch das in einem Satz zu fassen.',
    placeholder: 'Stichworte reichen.'
  }
};

export function maybeQueueMicroReflection(key) {
  if (!PROMPTS[key]) return false;
  if (Store.data.microReflections?.[key]) return false;
  showMicroReflection(key);
  return true;
}

function showMicroReflection(key) {
  const p = PROMPTS[key];
  if (!p) return;
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay micro-reflect';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="tw-box micro-box">
      <h3>${escapeHtml(p.title)}</h3>
      <p class="muted small">${escapeHtml(p.intro)}</p>
      <label class="micro-q">
        <span>${escapeHtml(p.question)}</span>
        <textarea id="micro-input" rows="3" placeholder="${escapeHtml(p.placeholder)}"></textarea>
      </label>
      <div class="tw-actions">
        <button class="btn btn-ghost" id="micro-skip">Überspringen</button>
        <button class="btn btn-primary" id="micro-save">Speichern</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const ta = overlay.querySelector('#micro-input');
  const handle = attachModal(overlay, { initialFocus: ta });
  overlay.querySelector('#micro-skip').onclick = () => {
    if (!Store.data.microReflections) Store.data.microReflections = {};
    Store.data.microReflections[key] = { skipped: true, week: Store.data.currentWeek, ts: Date.now() };
    Store.save();
    handle.close();
  };
  overlay.querySelector('#micro-save').onclick = () => {
    if (!Store.data.microReflections) Store.data.microReflections = {};
    Store.data.microReflections[key] = {
      answer: ta.value.trim(),
      week: Store.data.currentWeek,
      ts: Date.now(),
      question: p.question
    };
    Store.save();
    handle.close();
  };
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
