// glossquiz.js — Vierte Mini-Game: zu einer Erklärung den passenden
// Begriff finden. Übt die Glossar-Begriffe aktiv ein, ergänzt das
// passive Nachschlagen.

import { Store } from './state.js';
import { SFX } from './sound.js';
import { listGlossaryTerms } from './glossary.js';

// Welche Begriffe werden abgefragt (nicht alle 19 — wir picken die mit
// klaren Kern-Definitionen, damit das Quiz nicht beliebig wird).
const QUIZ_TERMS = [
  'Algorithmus', 'Filterblase', 'Echokammer', 'Engagement', 'Bot',
  'Engagement-Bait', 'Targeting (Werbung)', 'Rabbit Hole', 'Deepfake',
  'Dark Pattern', 'Astroturfing', 'Polarisierung'
];

const ROUNDS_TOTAL = 5;

function pickRounds() {
  const all = listGlossaryTerms().filter(t => QUIZ_TERMS.includes(t.term));
  // Shuffle deterministisch mit Seed (Wochen-abhängig, damit wiederholbar).
  const seed = (Store.data?.random_seed || 1) ^ Date.now();
  const arr = all.slice();
  let s = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, ROUNDS_TOTAL).map(target => {
    // Drei Distraktoren — andere Begriffe aus dem Pool.
    const others = all.filter(t => t.term !== target.term);
    const distractors = [];
    for (let i = 0; i < 3 && others.length; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const idx = s % others.length;
      distractors.push(others.splice(idx, 1)[0]);
    }
    const options = [target, ...distractors];
    // Shuffle die Optionen.
    for (let i = options.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const j = s % (i + 1);
      [options[i], options[j]] = [options[j], options[i]];
    }
    return { text: target.text, correct: target.term, options: options.map(o => o.term) };
  });
}

export function runGlossquiz(root, onClose) {
  const rounds = pickRounds();
  let idx = 0;
  let score = 0;

  function renderRound() {
    if (idx >= rounds.length) { finish(); return; }
    const r = rounds[idx];
    root.innerHTML = `
      <div class="minigame-header">
        <h2>Begriff zur Erklärung</h2>
        <div class="minigame-progress">Runde ${idx + 1} / ${rounds.length} · Punkte: ${score}</div>
      </div>
      <p class="muted">Welcher Begriff aus dem Glossar wird hier beschrieben?</p>
      <div class="glossquiz-prompt">${escapeHtml(r.text)}</div>
      <div class="glossquiz-options">
        ${r.options.map(opt => `<button class="gq-btn" data-term="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join('')}
      </div>
      <div id="gq-resolve" class="fc-resolve" hidden></div>
    `;
    root.querySelectorAll('.gq-btn').forEach(b => {
      b.onclick = () => {
        const correct = b.dataset.term === r.correct;
        if (correct) score++;
        const fb = root.querySelector('#gq-resolve');
        fb.hidden = false;
        fb.innerHTML = `
          <div class="fc-verdict color-${correct ? 'ok' : 'bad'}">
            <strong>${correct ? '✓ Richtig.' : '✗ Es war: „' + escapeHtml(r.correct) + '"'}</strong>
          </div>
          <p class="muted small">Bei Unsicherheit: Settings → Glossar nachschlagen.</p>
          <button class="btn btn-primary" id="gq-next">${idx < rounds.length - 1 ? 'Nächste Runde' : 'Ergebnis'}</button>
        `;
        fb.querySelector('#gq-next').onclick = () => { idx++; renderRound(); };
        SFX.swipe();
      };
    });
  }

  function finish() {
    if (!Store.data.minigameResults) Store.data.minigameResults = {};
    Store.data.minigameResults.glossquiz = { score, total: rounds.length, ts: Date.now() };
    Store.save();
    SFX.badge();
    const verdict = score === rounds.length
      ? 'Souverän. Du hast die Vokabeln drauf.'
      : score >= rounds.length - 1
      ? 'Sehr gut. Eine fast perfekte Runde.'
      : score >= rounds.length / 2
      ? 'Solide. Schau dir die schwierigeren Begriffe nochmal an.'
      : 'Die Begriffe lohnen sich. Settings → Glossar.';
    root.innerHTML = `
      <div class="minigame-finish">
        <h2>${score} / ${rounds.length}</h2>
        <p>${escapeHtml(verdict)}</p>
        <button class="btn btn-primary" id="gq-close">Zurück</button>
      </div>
    `;
    root.querySelector('#gq-close').onclick = onClose;
  }

  renderRound();
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
