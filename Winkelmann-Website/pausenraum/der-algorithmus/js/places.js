// places.js — Greifshafen-Karte als entdeckbares Modal.
// Klicks zählen, und ab dem zweiten Besuch eines Orts gibt es kleine
// Vignetten: kurze Begegnungen oder Beobachtungen, die das Profil leicht
// beeinflussen können.

import { Store, clamp } from './state.js';
import { getCharacter, avatarSvg } from './characters.js';

let PLACES = [];

export function initPlaces(data) {
  PLACES = data.places || [];
}

export function getPlaces() { return PLACES; }

// Vignetten pro Ort. Jede Vignette hat eine Bedingung (Mindestbesuch,
// Mindestwoche), einen Text und einen kleinen Effekt aufs Profil.
const VIGNETTES = {
  cafe_hafen: [
    { minVisit: 2, minWeek: 3,  who: 'char_lea',  text: 'Lea sitzt am Fenster, winkt dich kurz dazu. "Setz dich, ich hab noch zehn Minuten."', tags: { lifestyle: 0.05 } },
    { minVisit: 4, minWeek: 12, who: 'char_jule', text: 'Jule schreibt an einer Rezension. "Sag mal, wie liest sich das, ehrlich?"', tags: { lifestyle: 0.05 } }
  ],
  fleetplatz: [
    { minVisit: 2, minWeek: 5,  who: 'char_mira', text: 'Mira mit zwei Pappschildern unterm Arm. "Du kommst zum Aufbau, oder?"', tags: { 'politik-links': 0.05, klima: 0.05 } },
    { minVisit: 3, minWeek: 19, who: 'char_alt',  text: 'Wahlkampfstand der Neuen Alternative. Ein junger Mann drückt dir einen Flyer in die Hand. "Lies mal, was wir wirklich wollen."', tags: { 'politik-rechts': 0.04 } }
  ],
  schulhof: [
    { minVisit: 2, minWeek: 4,  who: 'char_moritz', text: 'Moritz spielt mit dem Handy. "Yo, der Patch ist live. Gönnst du dir das?"', tags: { gaming: 0.04 } },
    { minVisit: 3, minWeek: 16, who: 'char_sara',   text: 'Sara baut etwas Kleines aus zwei Steckbrettern. "Wenn ich morgen verloren bin, war\'s das hier."', tags: { wissenschaft: 0.05 } }
  ],
  marktplatz: [
    { minVisit: 2, minWeek: 8,  who: 'char_greif',  text: 'Ein Reporter von Greifshafen News interviewt jemanden. Du bleibst kurz stehen, hörst zu.', tags: { 'politik-mitte': 0.04 } },
    { minVisit: 3, minWeek: 21, who: 'char_buerger', text: 'Wahlkampfbühne der Bürgerliste. Die Kandidatin spricht ruhig, fast unaufgeregt. Ungewohnt.', tags: { 'politik-mitte': 0.04 } }
  ],
  buergerhaus: [
    { minVisit: 2, minWeek: 6, who: 'char_noah', text: 'Noah kommt aus einer Sitzung. "War zäh, aber sie haben sich am Ende auf was geeinigt. Klingt nach Mitte? Ist aber Demokratie."', tags: { 'politik-mitte': 0.05 } }
  ],
  altstadt: [
    { minVisit: 2, minWeek: 7, who: 'char_ana', text: 'Ana steht in einem Hauseingang, Kopfhörer auf, summt. Sie nickt dir zu.', tags: { musik: 0.04 } }
  ],
  campus: [
    { minVisit: 2, minWeek: 9,  who: 'char_tariq',  text: 'Tariq winkt von einer Bank. "Wir lesen gerade die Studie, über die alle reden. Spoiler: die Schlagzeile stimmt nicht."', tags: { wissenschaft: 0.06 } },
    { minVisit: 3, minWeek: 18, who: 'char_sophia', text: 'Sophia gibt gerade ein Interview. "Frag dich immer: cui bono?"', tags: { wissenschaft: 0.05 } }
  ],
  hafen: [
    { minVisit: 2, minWeek: 11, who: null, text: 'Eine Fähre legt ab. Möwen schreien. Dein Telefon vibriert. Du steckst es wieder weg.', tags: { lifestyle: 0.03 } }
  ]
};

export function renderMap(root, onClose) {
  root.innerHTML = `
    <header class="map-head">
      <h2>Greifshafen</h2>
      <button class="btn btn-ghost" id="map-close">Schließen</button>
    </header>
    <p class="muted small">Die Stadt deines Accounts. Wer ist wo unterwegs? Mehrmaliges Vorbeischauen kann unerwartete Begegnungen bringen.</p>
    <div class="map-grid" id="map-grid"></div>
    <div id="place-detail" class="place-detail" hidden></div>
  `;
  root.querySelector('#map-close').onclick = onClose;
  const grid = root.querySelector('#map-grid');
  for (const p of PLACES) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'map-tile';
    const visited = !!Store.data.placesVisited?.[p.id];
    if (visited) tile.classList.add('visited');
    tile.innerHTML = `<div class="map-emoji">${p.emoji}</div><div class="map-name">${escapeHtml(p.name)}</div>`;
    tile.onclick = () => {
      if (!Store.data.placesVisited) Store.data.placesVisited = {};
      Store.data.placesVisited[p.id] = (Store.data.placesVisited[p.id] || 0) + 1;
      Store.save();
      tile.classList.add('visited');
      showPlaceDetail(root, p);
    };
    grid.appendChild(tile);
  }
}

function pickVignetteFor(place) {
  const visits = Store.data.placesVisited?.[place.id] || 0;
  const week = Store.data.currentWeek;
  if (!Store.data.placeEvents) Store.data.placeEvents = {};
  const seen = Store.data.placeEvents[place.id] || [];
  const list = VIGNETTES[place.id] || [];
  for (const v of list) {
    const key = `${v.who || 'narration'}_${v.minWeek}`;
    if (visits >= v.minVisit && week >= v.minWeek && !seen.includes(key)) {
      seen.push(key);
      Store.data.placeEvents[place.id] = seen;
      // Effekt aufs Profil.
      if (v.tags) {
        for (const [t, val] of Object.entries(v.tags)) {
          Store.data.userProfile.interests[t] = clamp((Store.data.userProfile.interests[t] || 0) + val, 0, 1);
        }
      }
      Store.save();
      return v;
    }
  }
  return null;
}

function showPlaceDetail(root, place) {
  const detail = root.querySelector('#place-detail');
  detail.hidden = false;
  const chars = (place.regulars || []).map(getCharacter).filter(Boolean);
  const vignette = pickVignetteFor(place);
  let vignetteHtml = '';
  if (vignette) {
    const c = vignette.who ? getCharacter(vignette.who) : null;
    vignetteHtml = `
      <div class="vignette-card">
        <div class="vignette-tag muted small">Du triffst dort:</div>
        <div class="vignette-body">
          ${c ? `<div class="avatar small">${avatarSvg(c.avatar || 0)}</div>` : '<div class="vignette-icon">🌫️</div>'}
          <div class="vignette-text">${escapeHtml(vignette.text)}</div>
        </div>
      </div>
    `;
  }
  detail.innerHTML = `
    <div class="place-head"><span class="map-emoji">${place.emoji}</span><h3>${escapeHtml(place.name)}</h3></div>
    <p>${escapeHtml(place.desc)}</p>
    ${vignetteHtml}
    <div class="place-regulars">
      <div class="muted small">Stammgäste:</div>
      <div class="place-avatars">
        ${chars.map(c => `<div class="place-avatar"><div class="avatar">${avatarSvg(c.avatar || 0)}</div><div class="muted small">${escapeHtml(c.name)}</div></div>`).join('')}
      </div>
    </div>
  `;
  detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
