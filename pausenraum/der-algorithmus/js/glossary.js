// glossary.js — Schnellnachschlage für zentrale Begriffe.
// Im Settings erreichbar. Bewusst kurz: 3-4 Sätze pro Begriff,
// kein Wikipedia-Ersatz.

import { attachModal } from './modals.js';

const TERMS = [
  {
    term: 'Algorithmus',
    text: 'Eine Regel-Sammlung, nach der ein System entscheidet, welche Inhalte du siehst und in welcher Reihenfolge. In Streem siehst du genau diese Regeln im 🔍-Panel — bei echten Plattformen meist nicht.'
  },
  {
    term: 'Filterblase',
    text: 'Effekt, bei dem du algorithmisch hauptsächlich Inhalte siehst, die deinen bisherigen Vorlieben entsprechen. Andere Perspektiven werden seltener angezeigt — und du merkst das selten selbst.'
  },
  {
    term: 'Echokammer',
    text: 'Eine Filterblase mit sozialer Verstärkung: deine Meinung wird von immer denselben Stimmen bestätigt. Widerspruch erreicht dich kaum, weil deine Gilde, deine Freunde, dein Feed alle ähnlich ticken.'
  },
  {
    term: 'Engagement',
    text: 'Jede Interaktion: Like, Kommentar, Share, Verweildauer. Algorithmen messen Engagement, um Inhalte zu sortieren. Wütende Kommentare zählen meistens genauso viel wie zustimmende — das ist genau das Problem.'
  },
  {
    term: 'Reach (Reichweite)',
    text: 'Wie viele Menschen deinen Beitrag tatsächlich sehen. Hängt vom Algorithmus ab — nicht von deiner Followerzahl. Empörungslastige Inhalte bekommen oft mehr Reichweite als sachliche.'
  },
  {
    term: 'Bot',
    text: 'Automatisiertes Konto, das wie ein Mensch wirkt. Typische Hinweise: junger Account, hohe Posting-Frequenz, generisches Profilbild, Naming-Schema mit Zahlen. Bots verstärken Stimmungen, ohne dass jemand dafür haftet.'
  },
  {
    term: 'Engagement-Bait',
    text: 'Beiträge, die so gestaltet sind, dass sie Reaktionen provozieren — über inhaltlichen Wert hinaus. Beispiele: bewusst zugespitzte Formulierungen, „Stimmt zu, wenn ihr auch denkt …", Quizfragen ohne Sachbezug.'
  },
  {
    term: 'Outrage / Empörung',
    text: 'Empörung ist algorithmisch wertvoll, weil sie Engagement erzeugt. Genau deshalb steigt empörender Inhalt im Feed — auch wenn er manipuliert, vereinfacht oder schadet.'
  },
  {
    term: 'Targeting (Werbung)',
    text: 'Anzeigen werden gezielt an Gruppen ausgespielt, deren Profil zum Werbeziel passt. Politische Anzeigen sind dabei besonders heikel, weil unterschiedliche Gruppen unterschiedliche Botschaften zu sehen bekommen, ohne öffentliche Debatte.'
  },
  {
    term: 'Shadowban',
    text: 'Wenn deine Beiträge stiller weniger Reichweite bekommen, ohne dass dir das mitgeteilt wird. Schwer nachzuweisen, weil Plattformen sich selten dazu äußern. In Streem nicht implementiert, aber im echten Netz real.'
  },
  {
    term: 'Rabbit Hole',
    text: 'Das schrittweise Hineinrutschen in immer radikalere Inhalte. Empfehlungssysteme können das beschleunigen, weil sie „mehr vom Gleichen" liefern. Im Spiel bist du diesem Effekt mit der Gilde „Echte Werte" begegnet.'
  },
  {
    term: 'Deepfake',
    text: 'Manipulierte Bilder, Videos oder Audios, die mit KI erzeugt wurden. Wirken echt, sind es aber nicht. Faktencheck mit Rückwärtsbildersuche und Quellenprüfung ist die einfachste Verteidigung.'
  },
  {
    term: 'Dark Pattern',
    text: 'UI-Tricks, die dich zu Klicks oder Käufen drängen — z.B. unauffällige „Abmelden"-Buttons, künstliche Knappheit, irreführende Push-Notifications. Erkennen heißt nicht, nicht mehr zu nutzen — es heißt, weniger automatisch zu reagieren.'
  },
  {
    term: 'Engagement-Bait',
    text: 'Beiträge, die so gestaltet sind, dass sie Reaktionen provozieren — über inhaltlichen Wert hinaus. Beispiele: bewusst zugespitzte Formulierungen, „Stimm zu, wenn du auch denkst …", Quizfragen ohne Sachbezug.'
  },
  {
    term: 'Astroturfing',
    text: 'Künstlich erzeugte „Graswurzel"-Bewegung: viele scheinbar unabhängige Accounts vertreten dieselbe Position — koordiniert oder bot-getrieben. Zweck: eine Meinung größer wirken lassen, als sie ist.'
  },
  {
    term: 'Personalisierung',
    text: 'Inhalte werden gezielt auf dich zugeschnitten — über Klick-Verhalten, Standort, gefolgte Accounts, gekaufte Produkte. Vorteil: passgenau. Risiko: Filterblase und Manipulationsangriffe (Targeting) werden leichter.'
  },
  {
    term: 'Datenspur',
    text: 'Alles, was du einer Plattform hinterlässt — auch unbewusst: Verweildauer, Scroll-Tiefe, geschriebene aber nicht gepostete Entwürfe. Wird zu deinem Schatten-Profil und beeinflusst, was du in Zukunft siehst.'
  },
  {
    term: 'Polarisierung',
    text: 'Verschärfung gegensätzlicher Positionen, oft begleitet von emotionaler Aufladung. Algorithmen, die Engagement maximieren, können polarisierende Inhalte verstärken, weil sie mehr Reaktionen erzeugen.'
  }
];

export function listGlossaryTerms() {
  return TERMS.map(t => ({ term: t.term, text: t.text }));
}

export function openGlossary(initialTerm = '') {
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.innerHTML = `
    <div class="tw-box glossary-box">
      <header class="glossary-head">
        <h3>Glossar</h3>
        <button class="btn btn-ghost btn-small" id="glossary-close">Schließen</button>
      </header>
      <p class="muted small">Kurze Definitionen der Begriffe, die in Streem vorkommen. Klicke einen Eintrag, um ihn aufzuklappen.</p>
      <div class="glossary-search">
        <input type="search" id="glossary-q" placeholder="Suchen … (z.B. „Bot", „Filterblase")" aria-label="Glossar durchsuchen" />
      </div>
      <ul class="glossary-list" id="glossary-list"></ul>
      <p class="muted small glossary-empty" id="glossary-empty" hidden>Kein Eintrag passt zu deiner Suche.</p>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  overlay.querySelector('#glossary-close').onclick = () => handle.close();

  const list = overlay.querySelector('#glossary-list');
  const search = overlay.querySelector('#glossary-q');
  const empty = overlay.querySelector('#glossary-empty');

  function render(query) {
    const q = (query || '').trim().toLowerCase();
    const matches = TERMS
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => !q || t.term.toLowerCase().includes(q) || t.text.toLowerCase().includes(q));
    list.innerHTML = matches.map(({ t, i }) => `
      <li>
        <button class="glossary-term" data-i="${i}" aria-expanded="false">
          <strong>${escapeHtml(t.term)}</strong>
          <span class="glossary-chev" aria-hidden="true">+</span>
        </button>
        <div class="glossary-text" hidden>${escapeHtml(t.text)}</div>
      </li>
    `).join('');
    empty.hidden = matches.length > 0;
    list.querySelectorAll('.glossary-term').forEach(b => {
      b.onclick = () => {
        const txt = b.nextElementSibling;
        const open = txt.hidden;
        txt.hidden = !open;
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
        b.querySelector('.glossary-chev').textContent = open ? '−' : '+';
      };
    });
  }

  if (initialTerm) {
    search.value = initialTerm;
    render(initialTerm);
    // Den ersten Match direkt aufklappen.
    setTimeout(() => {
      const first = overlay.querySelector('.glossary-term');
      if (first) first.click();
    }, 50);
  } else {
    render('');
  }
  search.addEventListener('input', () => render(search.value));
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
