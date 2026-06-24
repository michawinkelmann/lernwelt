// factcheck.js — Mini-Game: Faktencheck. SuS bewerten Aussagen als
// echt / falsch / teilweise — mit Auflösung und Erklärung. Dient als
// Bot-Quiz-Pendant für Inhalte statt Profile.

import { Store } from './state.js';
import { attachModal } from './modals.js';
import { SFX } from './sound.js';

const ROUNDS = [
  {
    text: 'Eine Studie der TU Greifshafen zeigt: Social-Media-Nutzung mehr als 3h pro Tag senkt nachweislich den IQ.',
    verdict: 'falsch',
    tell: 'Korrelation ≠ Kausalität. Studien dieser Art messen Zusammenhänge, keine ursächliche Wirkung — und „IQ" ist hier auch noch ein problematisches Konstrukt.'
  },
  {
    text: 'In Greifshafen sind 23 % der unter-30-Jährigen mindestens einmal pro Woche auf einer politischen Demo.',
    verdict: 'teilweise',
    tell: 'Solche Zahlen schwanken stark je nach Definition („politische Demo"?) und Erhebungsmethode. Vorsicht bei runden Zahlen ohne Quelle.'
  },
  {
    text: 'Ein Faktencheck hat das umstrittene Video der Oberbürgermeisterin als Deepfake identifiziert.',
    verdict: 'echt',
    tell: 'Verifizierte Faktenchecker:innen (Correctiv, DPA, AFP) haben das im Spielverlauf bestätigt. Wichtig: nicht nur eine Quelle, sondern Mehrfachprüfung.'
  },
  {
    text: 'Wer einem rechten Account folgt, bekommt im Algorithmus 5× so viele rechte Inhalte gezeigt.',
    verdict: 'teilweise',
    tell: 'Empirisch dokumentiert, aber „5×" ist eine zu präzise Zahl. Studien zeigen den Effekt — der Faktor schwankt stark je nach Plattform und Nutzer:innen-Profil.'
  },
  {
    text: 'Telegram-Gruppen mit verschwörungsideologischen Inhalten sind in Deutschland nicht strafbar.',
    verdict: 'teilweise',
    tell: 'Allgemeines Posten ist nicht strafbar — Volksverhetzung, Beleidigung, Bedrohung etc. aber sehr wohl. Plattform-Hosting und Inhalt sind zu trennen.'
  }
];

const VERDICT_LABEL = { echt: 'Echt', falsch: 'Falsch', teilweise: 'Teilweise' };
const VERDICT_COLOR = { echt: 'ok', falsch: 'bad', teilweise: 'warn' };

export function runFactcheck(root, onClose) {
  let idx = 0;
  let score = 0;
  const guesses = [];

  function renderRound() {
    if (idx >= ROUNDS.length) { finish(); return; }
    const r = ROUNDS[idx];
    root.innerHTML = `
      <div class="minigame-header">
        <h2>Faktencheck-Sprint</h2>
        <div class="minigame-progress">Runde ${idx + 1} / ${ROUNDS.length} · Punkte: ${score}</div>
      </div>
      <p class="muted">Lies die Aussage. Markiere: echt, falsch oder teilweise. Es gibt nicht immer ein klares „ja/nein".</p>
      <div class="factcheck-card">
        <div class="factcheck-text">${escapeHtml(r.text)}</div>
        <div class="factcheck-choices">
          ${['echt', 'teilweise', 'falsch'].map(v => `
            <button class="fc-btn" data-v="${v}">${VERDICT_LABEL[v]}</button>
          `).join('')}
        </div>
      </div>
      <div id="fc-resolve" class="fc-resolve" hidden></div>
    `;
    root.querySelectorAll('.fc-btn').forEach(b => {
      b.onclick = () => {
        const choice = b.dataset.v;
        guesses.push({ choice, correct: choice === r.verdict });
        if (choice === r.verdict) score++;
        const fb = root.querySelector('#fc-resolve');
        fb.hidden = false;
        fb.innerHTML = `
          <div class="fc-verdict color-${VERDICT_COLOR[r.verdict]}">
            <strong>${choice === r.verdict ? '✓ Richtig.' : '✗ Tatsächlich: ' + VERDICT_LABEL[r.verdict]}</strong>
          </div>
          <p>${escapeHtml(r.tell)}</p>
          <button class="btn btn-primary" id="fc-next">${idx < ROUNDS.length - 1 ? 'Nächste Runde' : 'Ergebnis'}</button>
        `;
        fb.querySelector('#fc-next').onclick = () => { idx++; renderRound(); };
        SFX.swipe();
      };
    });
  }

  function finish() {
    if (!Store.data.minigameResults) Store.data.minigameResults = {};
    Store.data.minigameResults.factcheck = { score, total: ROUNDS.length, ts: Date.now() };
    Store.save();
    SFX.badge();
    const verdict = score === ROUNDS.length
      ? 'Sehr gut. Faktenchecks sind selten so eindeutig wie hier — aber du hast den Reflex.'
      : score >= ROUNDS.length - 1
      ? 'Stark. Die teilweise-Fälle sind die schwierigsten.'
      : score >= ROUNDS.length / 2
      ? 'Solide. Die „teilweise"-Antworten verlangen Vorsicht statt Reflex.'
      : 'Schwierig, oder? Faktenchecks sind selten Bauchsache. Lies langsam, prüfe Quellen.';
    root.innerHTML = `
      <div class="minigame-finish">
        <h2>${score} / ${ROUNDS.length}</h2>
        <p>${escapeHtml(verdict)}</p>
        <p class="muted small">Tipps zum Üben im echten Netz: Rückwärtsbildersuche, Mehrfachquellen, Datum prüfen, Kontext prüfen — und immer fragen: <em>wem nützt diese Information?</em></p>
        <button class="btn btn-primary" id="fc-close">Zurück</button>
      </div>
    `;
    root.querySelector('#fc-close').onclick = onClose;
  }

  renderRound();
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
