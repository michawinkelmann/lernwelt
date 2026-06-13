// concepts.js — Kurze Konzept-Karten, die vor didaktischen Wendepunkten
// angezeigt werden. Bewusst sehr knapp gehalten — eine Karte ≤ 60 Sekunden Lesezeit.

import { Store } from './state.js';
import { attachModal } from './modals.js';
import { openGlossary } from './glossary.js';

// Begriffe, die in Konzept-Texten als Inline-Links zum Glossar werden.
// Reihenfolge nach Länge absteigend, damit „Engagement-Bait" vor „Engagement"
// gematcht wird.
const GLOSSARY_TERMS = [
  'Engagement-Bait', 'Filterblase', 'Echokammer', 'Algorithmus', 'Deepfake',
  'Empörung', 'Shadowban', 'Targeting', 'Reichweite', 'Reach',
  'Rabbit Hole', 'Outrage', 'Bot'
];

function linkifyGlossaryTerms(text) {
  let safe = escapeHtml(text);
  for (const term of GLOSSARY_TERMS) {
    const re = new RegExp(`\\b(${escapeRegex(term)})\\b`, 'g');
    safe = safe.replace(re, '<button type="button" class="glossary-link" data-term="$1">$1</button>');
  }
  return safe;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const CONCEPTS = {
  bots_intro: {
    title: 'Was ist ein Bot?',
    points: [
      'Ein Bot ist ein automatisiertes Konto, das aussieht wie ein Mensch — postet, liked, kommentiert.',
      'Typische Tells: sehr junger Account, hohe Posting-Frequenz, generisches Profilbild oder Naming-Schema mit Zahlen.',
      'Gefährlich, weil sie Stimmungen verstärken können, ohne dass jemand dafür Verantwortung trägt.',
      'Plattformen erkennen viele, aber nicht alle. Manche Profile sind „Cyborgs": teils Mensch, teils Auto-Posting.'
    ],
    bg: 'tech'
  },
  bot_minigame_intro: {
    title: 'Gleich: Bot oder Mensch?',
    points: [
      'Du siehst gleich Profile mit Bio, Beitrag, Account-Alter und Posting-Frequenz.',
      'Markiere für jedes: Bot oder Mensch. Beide können vorkommen — auch beide Bots oder beide Menschen.',
      'Es ist absichtlich nicht immer eindeutig. Genau das ist der Punkt.'
    ],
    bg: 'tech'
  },
  algorithm_panel_intro: {
    title: 'Blick hinter den Algorithmus',
    points: [
      'Plattformen speichern Modelle über dich. Deine Interessen, deine politische Neigung, deine Outrage-Toleranz.',
      'Diese Werte siehst du oben rechts unter 🔍 — sie werden mit jeder Aktion neu justiert.',
      'In der echten Welt sind diese Werte meist nicht einsehbar. Streem ist hier ehrlich, damit du siehst, wie es funktioniert.'
    ],
    bg: 'tech'
  },
  ads_intro: {
    title: 'Warum jetzt Anzeigen?',
    points: [
      'Anzeigen sind gekennzeichnet. Sie werden nach deinen Interessen ausgespielt — die Plattform verdient daran.',
      'Politische Anzeigen sind besonders heikel: sie können gezielt nur bestimmte Gruppen erreichen ohne öffentliche Debatte.',
      'Klick „Warum sehe ich das?" unter Anzeigen, um das Targeting zu sehen.'
    ],
    bg: 'commerce'
  },
  dark_patterns: {
    title: 'Dark Patterns',
    points: [
      'UI-Tricks, die dich zu Klicks drängen — z.B. unauffällig platzierte „Abmelden"-Buttons, vorab angekreuzte Newsletter, künstliche Knappheit („nur noch 2 verfügbar").',
      'Auch Push-Notifications, die so aussehen, als würde etwas passieren, sind Dark Patterns — du hast Streem-Notifications wie „Sara hat dich erwähnt" gesehen, ohne dass tatsächlich etwas war.',
      'Streak-Anzeigen („18 Tage in Folge!"), endlose Feeds, ungelesen-Badges — alles bewusst gestaltete Engagement-Treiber.',
      'Erkennen heißt nicht: nicht mehr nutzen. Es heißt: weniger automatisch reagieren.'
    ],
    bg: 'commerce'
  },
  recommender: {
    title: 'Empfehlungssysteme',
    points: [
      'Ein Empfehlungssystem sortiert Inhalte nach einer Funktion: viele Faktoren werden gewichtet, der Top-Wert kommt zuerst.',
      'In Streem siehst du diese Faktoren live: Affinität, Engagement, Aktualität, Soziales, Anzeigen, Vielfalt, Qualität, Empörungsstrafe, Gegen-Perspektive.',
      'Plattformen bauen ähnliche Systeme — die Gewichte sind aber meistens nicht öffentlich.',
      'Die Sandbox lässt dich die Gewichte selbst verschieben. Ein „guter" Algorithmus ist eine politische Entscheidung, kein technisches Detail.'
    ],
    bg: 'tech'
  }
};

let queued = null;

export function queueConcept(key) {
  if (!CONCEPTS[key]) return;
  if (Store.data.conceptsSeen?.[key]) return;
  queued = key;
}

export function maybeShowQueuedConcept() {
  if (!queued) return false;
  const key = queued;
  queued = null;
  showConcept(key);
  return true;
}

export function listConcepts() {
  return Object.entries(CONCEPTS).map(([key, c]) => ({ key, ...c }));
}

export function showConcept(key) {
  const c = CONCEPTS[key];
  if (!c) return;
  if (!Store.data.conceptsSeen) Store.data.conceptsSeen = {};
  Store.data.conceptsSeen[key] = Date.now();
  Store.save();

  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay concept-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="concept-box concept-bg-${c.bg}">
      <div class="concept-kicker">Kurz erklärt</div>
      <h2>${escapeHtml(c.title)}</h2>
      <ul class="concept-points">
        ${c.points.map(p => `<li>${linkifyGlossaryTerms(p)}</li>`).join('')}
      </ul>
      <button class="btn btn-primary concept-go" id="concept-close">Verstanden</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  overlay.querySelector('#concept-close').onclick = () => handle.close();
  overlay.querySelectorAll('.glossary-link').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openGlossary(btn.dataset.term);
    };
  });
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
