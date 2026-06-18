// headline.js — Mini-Game: derselbe Befund, drei Schlagzeilen. Welche
// stimmt zur Originalstudie? Übt das Lesen von Pressetexten gegenüber
// dem Studienabstract.

import { Store } from './state.js';
import { SFX } from './sound.js';

const ROUNDS = [
  {
    abstract: 'Eine deutsche Längsschnittstudie (N=3 200, 14–18 Jahre) untersucht den Zusammenhang von Bildschirmzeit und Schlafqualität. Ergebnis: Pro Stunde zusätzlicher Bildschirmzeit nach 21 Uhr sinkt die selbst-eingeschätzte Schlafqualität um durchschnittlich 0,18 Punkte auf einer 5er-Skala. Effekt verschwindet bei kontrolliertem Faktor „Smartphone aus dem Schlafzimmer".',
    headlines: [
      { text: 'Studie: Jede Stunde Handy macht müder.',                                 fair: false, why: 'Verzerrend: „macht müder" suggeriert Kausalität, der Effekt ist klein und kontextabhängig.' },
      { text: 'Forschung zeigt: Handy gehört aus dem Schlafzimmer.',                    fair: true,  why: 'Holt den entscheidenden Befund hervor — Effekt verschwindet bei Smartphone-Verbannung.' },
      { text: 'Schock-Studie: 5er-Skala-Schlafqualität halbiert sich durch Smartphone.', fair: false, why: 'Falsch: 0,18 Punkte ≠ Halbierung. Pure Klick-Bait.' }
    ]
  },
  {
    abstract: 'Eine Studie der ETH Zürich (N=1 800 Twitter-Nutzer) untersucht, wie sich Inhalte mit hoher Empörung im Feed verbreiten. Befund: Tweets mit moralisch aufgeladenen Begriffen werden 17 % öfter retweetet als neutrale — der Effekt wurde innerhalb politisch gleichgesinnter Cluster gemessen, nicht plattformübergreifend.',
    headlines: [
      { text: 'Empörung viraler als alles andere — Studie zeigt Algorithmus-Versagen.',  fair: false, why: '„Alles andere" überzogen; „Algorithmus-Versagen" wertet, was die Studie deskriptiv beschreibt.' },
      { text: 'Empörung pusht Reichweite leicht — vor allem im eigenen Lager.',          fair: true,  why: 'Spiegelt 17 % („leicht") und den In-Group-Kontext exakt.' },
      { text: 'Twitter lebt von Hass — neue Studie.',                                    fair: false, why: '„Hass" ist nicht „moralisch aufgeladene Begriffe"; „lebt von" hat keinen Beleg.' }
    ]
  },
  {
    abstract: 'Meta-Analyse aus 47 Studien zu Filter-Bubbles (2015–2023): Der durchschnittliche Effekt algorithmischer Personalisierung auf politische Polarisierung ist statistisch signifikant, aber **kleiner** als der Effekt selbstgewählter Mediennutzung (TV, Zeitungen) — der Algorithmus verstärkt, schafft aber nicht.',
    headlines: [
      { text: 'Filterblasen sind ein Mythos — Studie räumt auf.',                       fair: false, why: '„Mythos" ist die Gegenseite, ebenso überzogen. Die Studie sagt: kleiner Effekt, aber real.' },
      { text: 'Algorithmen verstärken Polarisierung — schaffen sie aber nicht.',         fair: true,  why: 'Trifft die Differenzierung der Meta-Analyse präzise.' },
      { text: 'Studie: Polarisierung passiert vor allem im TV.',                          fair: false, why: 'Vergleichsaussage, aber „passiert vor allem" verzerrt — relativiert, was der Algorithmus tut.' }
    ]
  }
];

export function runHeadline(root, onClose) {
  let idx = 0;
  let score = 0;
  function renderRound() {
    if (idx >= ROUNDS.length) { finish(); return; }
    const r = ROUNDS[idx];
    root.innerHTML = `
      <div class="minigame-header">
        <h2>Schlagzeile zur Studie</h2>
        <div class="minigame-progress">Runde ${idx + 1} / ${ROUNDS.length} · Punkte: ${score}</div>
      </div>
      <p class="muted">Du liest das Abstract. Welche der drei Schlagzeilen gibt es fair wieder?</p>
      <div class="headline-abstract">${escapeHtml(r.abstract)}</div>
      <div class="headline-choices">
        ${r.headlines.map((h, i) => `<button class="headline-btn" data-i="${i}">${escapeHtml(h.text)}</button>`).join('')}
      </div>
      <div id="hl-resolve" class="fc-resolve" hidden></div>
    `;
    root.querySelectorAll('.headline-btn').forEach(b => {
      b.onclick = () => {
        const i = parseInt(b.dataset.i, 10);
        const correctIdx = r.headlines.findIndex(h => h.fair);
        const correct = i === correctIdx;
        if (correct) score++;
        const fb = root.querySelector('#hl-resolve');
        fb.hidden = false;
        fb.innerHTML = `
          <div class="fc-verdict color-${correct ? 'ok' : 'bad'}">
            <strong>${correct ? '✓ Richtig.' : '✗ Faire Wiedergabe wäre: „' + escapeHtml(r.headlines[correctIdx].text) + '"'}</strong>
          </div>
          <div class="headline-analysis">
            ${r.headlines.map((h, j) => `
              <div class="headline-analysis-row ${j === correctIdx ? 'fair' : 'unfair'} ${j === i ? 'chosen' : ''}">
                <strong>${escapeHtml(h.text)}</strong>
                <span class="muted small">${escapeHtml(h.why)}</span>
              </div>
            `).join('')}
          </div>
          <button class="btn btn-primary" id="hl-next">${idx < ROUNDS.length - 1 ? 'Nächste Runde' : 'Ergebnis'}</button>
        `;
        fb.querySelector('#hl-next').onclick = () => { idx++; renderRound(); };
        SFX.swipe();
      };
    });
  }
  function finish() {
    if (!Store.data.minigameResults) Store.data.minigameResults = {};
    Store.data.minigameResults.headline = { score, total: ROUNDS.length, ts: Date.now() };
    Store.save();
    SFX.badge();
    const verdict = score === ROUNDS.length
      ? 'Sehr gut. Du hast die Übersetzung von Studie zu Schlagzeile drauf.'
      : score >= ROUNDS.length - 1
      ? 'Stark. Die Mitte zwischen „Mythos" und „Schock" ist genau die schwierige Stelle.'
      : score >= ROUNDS.length / 2
      ? 'Solide. Tipp: Schlagzeilen, die zu klar wirken, übersetzen oft schlecht.'
      : 'Schwierig. Echte Studien sind selten so klar, wie die Schlagzeile suggeriert.';
    root.innerHTML = `
      <div class="minigame-finish">
        <h2>${score} / ${ROUNDS.length}</h2>
        <p>${escapeHtml(verdict)}</p>
        <p class="muted small">Prüf bei echten Studien immer: Stichprobengröße, gemessen vs. kausal, Vergleichsgruppe — und ob die Schlagzeile das alles auch trifft.</p>
        <button class="btn btn-primary" id="hl-close">Zurück</button>
      </div>
    `;
    root.querySelector('#hl-close').onclick = onClose;
  }
  renderRound();
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
