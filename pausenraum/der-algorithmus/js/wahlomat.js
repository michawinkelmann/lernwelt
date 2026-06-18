// wahlomat.js — Wahlomat-artiges Quiz vor der Wahl. Acht fiktive Aussagen,
// SuS markieren zustimmen/neutral/ablehnen. System matcht mit den vier
// Greifshafener Parteien und vergleicht das Match mit der Feed-Wahrnehmung.

import { Store } from './state.js';
import { attachModal } from './modals.js';
import { SFX } from './sound.js';

// Aussagen: jede Aussage hat eine Position pro Partei (-1 = klar dagegen,
// 0 = neutral/keine Position, +1 = klar dafür). Lean von links nach rechts:
// p_zukunft (-0.6) → p_buerger (0.1) → p_alt (0.55) → p_heimat (0.9).
const STATEMENTS = [
  {
    id: 's_klima',
    text: 'Greifshafen soll bis 2030 CO₂-neutralen ÖPNV haben.',
    positions: { p_zukunft:  1, p_buerger:  0, p_alt: -1, p_heimat: -1 }
  },
  {
    id: 's_wohnen',
    text: 'Wir brauchen 50 % mehr Sozialwohnungen am Westhafen.',
    positions: { p_zukunft:  1, p_buerger:  0, p_alt: -1, p_heimat: -1 }
  },
  {
    id: 's_polizei',
    text: 'Mehr Polizeipräsenz in der Altstadt — sichtbar und konsequent.',
    positions: { p_zukunft: -1, p_buerger:  1, p_alt:  1, p_heimat:  1 }
  },
  {
    id: 's_haushalt',
    text: 'Der kommunale Haushalt sollte komplett öffentlich einsehbar sein.',
    positions: { p_zukunft:  1, p_buerger:  1, p_alt:  0, p_heimat: -1 }
  },
  {
    id: 's_migration',
    text: 'Abschiebungen sollen schneller und konsequenter durchgesetzt werden.',
    positions: { p_zukunft: -1, p_buerger:  0, p_alt:  1, p_heimat:  1 }
  },
  {
    id: 's_buergerrat',
    text: 'Bürger:innen-Räte sollen ein festes Mitspracheformat werden.',
    positions: { p_zukunft:  1, p_buerger:  0, p_alt: -1, p_heimat: -1 }
  },
  {
    id: 's_stadtfest',
    text: 'Stadtfeste sollen vor allem traditionell ausgerichtet sein.',
    positions: { p_zukunft: -1, p_buerger:  0, p_alt:  1, p_heimat:  1 }
  },
  {
    id: 's_schulen',
    text: 'Schulen sollen mehr in Klimabildung und Demokratie investieren.',
    positions: { p_zukunft:  1, p_buerger:  0, p_alt: -1, p_heimat: -1 }
  }
];

const PARTY_META = {
  p_zukunft: { name: 'Zukunft Greifshafen', color: '#4ade80' },
  p_buerger: { name: 'Bürgerliste',         color: '#60a5fa' },
  p_alt:     { name: 'Neue Alternative',     color: '#f97316' },
  p_heimat:  { name: 'Heimat Zuerst',        color: '#a16207' }
};

const ANSWER_VALUES = { agree: 1, neutral: 0, disagree: -1 };

export function openWahlomat(onClose) {
  let answers = Store.data.wahlomat?.answers || {};
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.innerHTML = `
    <div class="tw-box wahlomat-box">
      <header class="wahlomat-head">
        <h3>Wahlomat Greifshafen</h3>
        <button class="btn btn-ghost btn-small" id="wahlomat-close">Schließen</button>
      </header>
      <p class="muted small">Acht Aussagen. Stimmst du zu, bist du neutral, lehnst du ab? Am Ende zeigen wir, welche Partei deinen Antworten am nächsten kommt — und vergleichen das mit dem, was dein Feed dir vermittelt hat.</p>
      <div class="wahlomat-list" id="wahlomat-list"></div>
      <div class="wahlomat-actions">
        <button class="btn btn-primary" id="wahlomat-submit">Ergebnis zeigen</button>
      </div>
      <div id="wahlomat-result" class="wahlomat-result" hidden></div>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay, { onClose });
  overlay.querySelector('#wahlomat-close').onclick = () => handle.close();

  const list = overlay.querySelector('#wahlomat-list');
  for (const s of STATEMENTS) {
    const row = document.createElement('div');
    row.className = 'wahlomat-row';
    row.innerHTML = `
      <div class="wahlomat-q">${escapeHtml(s.text)}</div>
      <div class="wahlomat-choices" role="radiogroup" aria-label="${escapeHtml(s.text)}">
        ${['agree', 'neutral', 'disagree'].map(a => `
          <label class="wahlomat-choice">
            <input type="radio" name="${s.id}" value="${a}" ${answers[s.id] === a ? 'checked' : ''} />
            <span>${a === 'agree' ? 'Zustimmen' : a === 'neutral' ? 'Neutral' : 'Ablehnen'}</span>
          </label>
        `).join('')}
      </div>
    `;
    list.appendChild(row);
  }

  overlay.querySelector('#wahlomat-submit').onclick = () => {
    answers = {};
    for (const s of STATEMENTS) {
      const r = list.querySelector(`input[name="${s.id}"]:checked`);
      if (r) answers[s.id] = r.value;
    }
    if (Object.keys(answers).length < STATEMENTS.length) {
      toast('Bitte alle Aussagen bewerten.');
      return;
    }
    Store.data.wahlomat = { answers, ts: Date.now() };
    Store.save();
    showResult(overlay, answers);
    SFX.badge();
  };
}

function showResult(overlay, answers) {
  // Match-Score pro Partei berechnen: Summe(min(|user|, |party|) * sign-Match) / max-Punkte
  const scores = {};
  let maxPoints = 0;
  for (const s of STATEMENTS) {
    const userVal = ANSWER_VALUES[answers[s.id]];
    if (userVal === 0) continue; // neutral zählt nicht für matching
    maxPoints += 1;
    for (const [pId, partyVal] of Object.entries(s.positions)) {
      if (!(pId in scores)) scores[pId] = 0;
      // Match: gleiches Vorzeichen = +1, gegensätzlich = 0, partial = 0.5
      if (userVal === partyVal) scores[pId] += 1;
      else if (userVal === 0 || partyVal === 0) scores[pId] += 0.5;
      // gegensätzlich: 0
    }
  }
  const ranked = Object.entries(scores)
    .map(([id, s]) => ({ id, score: maxPoints ? s / (STATEMENTS.length) : 0 }))
    .sort((a, b) => b.score - a.score);

  // Feed-Bias: was hat der Feed bereits gezeigt? Wir nutzen Store.data.electionData.perceived
  // wenn schon gewählt wurde — sonst Lean-basiert.
  const lean = Store.data.userProfile.political_lean_estimated || 0;
  const partyByLean = { p_zukunft: -0.6, p_buerger: 0.1, p_alt: 0.55, p_heimat: 0.9 };
  const feedBias = Object.entries(partyByLean)
    .map(([id, pLean]) => ({ id, closeness: 1 - Math.abs(pLean - lean) / 2 }))
    .sort((a, b) => b.closeness - a.closeness);

  const result = overlay.querySelector('#wahlomat-result');
  result.hidden = false;
  result.innerHTML = `
    <h4>Dein Quiz-Ergebnis</h4>
    <p class="muted small">Match mit den Greifshafener Parteien — rein anhand deiner Antworten, ohne Feed-Einfluss:</p>
    <div class="wahlomat-bars">
      ${ranked.map(r => {
        const meta = PARTY_META[r.id];
        const pct = Math.round(r.score * 100);
        return `<div class="wahlomat-bar-row">
          <span class="wahlomat-bar-label" style="color:${meta.color}">${escapeHtml(meta.name)}</span>
          <div class="wahlomat-bar"><div class="wahlomat-bar-fill" style="width:${pct}%;background:${meta.color}"></div></div>
          <span class="wahlomat-bar-pct">${pct} %</span>
        </div>`;
      }).join('')}
    </div>
    <h4 style="margin-top:14px">Was dein Feed dir nahegelegt hat</h4>
    <p class="muted small">Über deine Lean-Schätzung (${lean.toFixed(2)}) — welche Parteien dein Algorithmus am ehesten ins Sichtfeld gerückt hat:</p>
    <div class="wahlomat-bars">
      ${feedBias.map(r => {
        const meta = PARTY_META[r.id];
        const pct = Math.round(r.closeness * 100);
        return `<div class="wahlomat-bar-row">
          <span class="wahlomat-bar-label" style="color:${meta.color}">${escapeHtml(meta.name)}</span>
          <div class="wahlomat-bar"><div class="wahlomat-bar-fill" style="width:${pct}%;background:${meta.color};opacity:0.6"></div></div>
          <span class="wahlomat-bar-pct">${pct} %</span>
        </div>`;
      }).join('')}
    </div>
    <p class="wahlomat-insight">${insightFor(ranked, feedBias)}</p>
  `;
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function insightFor(ranked, feedBias) {
  const topQuiz = ranked[0]?.id;
  const topFeed = feedBias[0]?.id;
  if (!topQuiz || !topFeed) return '';
  if (topQuiz === topFeed) {
    return 'Quiz und Feed zeigen in dieselbe Richtung. Das kann heißen: dein Feed bestätigt dich. Frag dich, ob du die Anderen-Argumente überhaupt noch gut kennst.';
  }
  return 'Quiz und Feed weichen ab. Das ist auffällig: dein Feed hat dir andere Parteien nahegelegt, als dein Antwortverhalten zu einer Politik passen würde. Algorithmische Resonanz erzeugt nicht automatisch politische Übereinstimmung.';
}

function toast(msg) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
