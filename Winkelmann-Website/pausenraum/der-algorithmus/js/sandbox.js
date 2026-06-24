// sandbox.js — Editor für den eigenen Algorithmus.
// GUI-Slider → Weights → Live-Vorschau + 10-Wochen-Simulation.

import { Store } from './state.js';
import { buildFeed } from './algorithm.js';
import { getCharacter } from './characters.js';

let POSTS = [];
let ADS = [];

const SLIDER_DEFS = [
  { key: 'affinity',        label: 'Interessen-Affinität',    min: 0, max: 2, step: 0.05,
    desc: 'Wie stark passt der Feed zu dem, was du bisher gemocht hast?' },
  { key: 'engagement',      label: 'Engagement-Boost',         min: 0, max: 2, step: 0.05,
    desc: 'Belohnt Posts, die viele Likes/Kommentare/Empörung erzeugen.' },
  { key: 'recency',         label: 'Aktualität',               min: 0, max: 2, step: 0.05,
    desc: 'Wie sehr zählt, dass ein Post frisch ist?' },
  { key: 'social',          label: 'Soziales Gewicht',         min: 0, max: 2, step: 0.05,
    desc: 'Wie stark zählen Accounts, denen du folgst?' },
  { key: 'ads',             label: 'Anzeigen',                  min: 0, max: 2, step: 0.05,
    desc: 'Wie prominent werden Anzeigen einsortiert?' },
  { key: 'diversity',       label: 'Vielfalt-Strafe',          min: 0, max: 1.5, step: 0.05,
    desc: 'Hoch = weniger gleiche Inhalte hintereinander.' },
  { key: 'quality',         label: 'Qualitäts-Bonus',          min: 0, max: 2, step: 0.05,
    desc: 'Belohnt Posts mit journalistischer Qualität.' },
  { key: 'outragePenalty',  label: 'Empörungs-Strafe',         min: 0, max: 2, step: 0.05,
    desc: 'Bestraft empörungslastige Posts.' },
  { key: 'balance',         label: 'Gegen-Perspektive',        min: 0, max: 2, step: 0.05,
    desc: 'Bonus für Posts, die deiner politischen Richtung entgegenstehen.' }
];

export function initSandbox(posts, ads) {
  POSTS = posts;
  ADS = ads;
}

export function renderSandbox(onClose) {
  const d = Store.data;
  const current = d.sandboxRules || { ...d.weights };
  // Slider-Liste
  const sliders = document.getElementById('sandbox-sliders');
  sliders.innerHTML = '<h3>Deine Regeln</h3>';
  for (const def of SLIDER_DEFS) {
    const row = document.createElement('div');
    row.className = 'slider-row';
    row.innerHTML = `
      <div class="slider-top">
        <label>${def.label}</label><b data-key="${def.key}">${Number(current[def.key] ?? 0).toFixed(2)}</b>
      </div>
      <input type="range" min="${def.min}" max="${def.max}" step="${def.step}"
             value="${current[def.key] ?? 0}" data-slider="${def.key}" aria-label="${def.label}" />
      <div class="slider-desc">${def.desc}</div>
    `;
    sliders.appendChild(row);
  }

  const presetRow = document.createElement('div');
  presetRow.className = 'sandbox-presets';
  presetRow.innerHTML = `
    <button class="btn btn-ghost" data-preset="current">Wie bisher</button>
    <button class="btn btn-ghost" data-preset="quality">Qualität</button>
    <button class="btn btn-ghost" data-preset="chrono">Chronologisch</button>
    <button class="btn btn-ghost" data-preset="balance">Ausgleich</button>
    <button class="btn btn-ghost preset-challenge" data-preset="empoerung">Empörungs-Booster ⚠</button>
    <button class="btn btn-ghost preset-challenge" data-preset="calm">Ruhe-Modus 🧘</button>
  `;
  sliders.appendChild(presetRow);
  const desc = document.createElement('p');
  desc.className = 'muted small sandbox-preset-desc';
  desc.textContent = 'Probier die Challenge-Presets: „Empörungs-Booster" zeigt, was eine reine Outrage-Maschine produziert. „Ruhe-Modus" ist das Gegenteil — wie würde dein Feed aussehen, wenn du gar nicht mehr gehookt werden sollst?';
  sliders.appendChild(desc);

  // Eigene Presets: speichern / laden / löschen.
  const customPresets = Store.data.customPresets || {};
  const customRow = document.createElement('div');
  customRow.className = 'sandbox-custom-presets';
  customRow.innerHTML = `
    <div class="sandbox-custom-head">
      <span class="muted small">Eigene Presets</span>
      <button class="btn btn-ghost btn-small" id="sandbox-save-preset">+ Aktuelle Slider speichern</button>
    </div>
    <div class="sandbox-custom-list" id="sandbox-custom-list"></div>
  `;
  sliders.appendChild(customRow);
  function refreshCustomList() {
    const list = customRow.querySelector('#sandbox-custom-list');
    const presets = Store.data.customPresets || {};
    const entries = Object.entries(presets);
    if (!entries.length) {
      list.innerHTML = '<span class="muted small">Noch keine eigenen Presets — speichere ein Setup, an dem du weiterprobieren willst.</span>';
      return;
    }
    list.innerHTML = entries.map(([name, w]) => `
      <div class="sandbox-custom-item">
        <button class="btn btn-ghost btn-small sandbox-load" data-name="${escapeHtml(name)}">${escapeHtml(name)}</button>
        <button class="btn btn-danger btn-small sandbox-del" data-name="${escapeHtml(name)}" aria-label="Löschen">×</button>
      </div>
    `).join('');
    list.querySelectorAll('.sandbox-load').forEach(b => {
      b.onclick = () => loadCustomPreset(b.dataset.name);
    });
    list.querySelectorAll('.sandbox-del').forEach(b => {
      b.onclick = () => {
        if (Store.data.customPresets) {
          delete Store.data.customPresets[b.dataset.name];
          Store.save();
          refreshCustomList();
        }
      };
    });
  }
  customRow.querySelector('#sandbox-save-preset').onclick = () => {
    const name = prompt('Name für dieses Preset:', 'Mein Algorithmus');
    if (!name) return;
    if (!Store.data.customPresets) Store.data.customPresets = {};
    Store.data.customPresets[name.trim().slice(0, 40)] = { ...rules };
    Store.save();
    refreshCustomList();
  };
  function loadCustomPreset(name) {
    const w = Store.data.customPresets?.[name];
    if (!w) return;
    for (const [k, v] of Object.entries(w)) {
      rules[k] = v;
      const slider = sliders.querySelector(`[data-slider="${k}"]`);
      const lbl = sliders.querySelector(`[data-key="${k}"]`);
      if (slider) slider.value = v;
      if (lbl) lbl.textContent = (+v).toFixed(2);
    }
    Store.data.sandboxRules = { ...rules };
    Store.save();
    previewFeed(rules);
  }
  refreshCustomList();

  const rules = { ...current };
  sliders.querySelectorAll('[data-slider]').forEach(el => {
    el.oninput = () => {
      rules[el.dataset.slider] = parseFloat(el.value);
      sliders.querySelector(`[data-key="${el.dataset.slider}"]`).textContent = rules[el.dataset.slider].toFixed(2);
      Store.data.sandboxRules = { ...rules };
      Store.save();
      previewFeed(rules);
    };
  });
  presetRow.querySelectorAll('[data-preset]').forEach(b => {
    b.onclick = () => applyPreset(b.dataset.preset, rules, sliders);
  });

  previewFeed(rules);

  document.getElementById('btn-sim').onclick = () => simulate(rules);
  document.getElementById('btn-sandbox-close').onclick = () => onClose && onClose();
  const battleBtn = document.getElementById('btn-battle');
  if (battleBtn) battleBtn.onclick = () => openAlgorithmBattle(rules);
  const exportBtn = document.getElementById('btn-export-rules');
  if (exportBtn) exportBtn.onclick = () => showPseudoCode(rules);
  const tourBtn = document.getElementById('btn-sandbox-tour');
  if (tourBtn) tourBtn.onclick = () => runSandboxTour(rules, sliders);
  // Beim ersten Mal automatisch einsteigen.
  if (!Store.data.sandboxTourDone) {
    setTimeout(() => runSandboxTour(rules, sliders), 600);
  }
  // Reset-Toggle: simulieren wir auf dem Start-Profil oder dem aktuellen Profil?
  const simModeRow = document.querySelector('#sandbox-sim-mode');
  if (simModeRow) {
    simModeRow.querySelectorAll('input[name=sim-mode]').forEach(r => {
      r.onchange = () => previewFeed(rules);
    });
  }
}

// Algorithm-Battle: zwei Slider-Setups side-by-side, ihre Feeds gleichzeitig
// sichtbar. Zeigt drastisch, wie unterschiedlich „derselbe Pool" wirken kann.
function openAlgorithmBattle(currentRules) {
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.innerHTML = `
    <div class="tw-box big battle-box">
      <header class="battle-head">
        <h2>Algorithmus-Battle</h2>
        <button class="btn btn-ghost btn-small" id="battle-close">Schließen</button>
      </header>
      <p class="muted small">Zwei Algorithmen, derselbe Post-Pool, dein Profil. So unterschiedlich kann derselbe Feed aussehen.</p>
      <div class="battle-grid">
        <section class="battle-side" data-side="left">
          <h3>A — Engagement-getrieben</h3>
          <select class="battle-preset" data-side="left" aria-label="Voreinstellung A">
            <option value="empoerung">Empörungs-Booster</option>
            <option value="default" selected>Streem-Default</option>
            <option value="chrono">Chronologisch</option>
            <option value="quality">Qualität</option>
            <option value="calm">Ruhe-Modus</option>
            <option value="balance">Ausgleich</option>
          </select>
          <div class="battle-feed" id="battle-feed-left"></div>
        </section>
        <section class="battle-side" data-side="right">
          <h3>B — Qualitätsorientiert</h3>
          <select class="battle-preset" data-side="right" aria-label="Voreinstellung B">
            <option value="empoerung">Empörungs-Booster</option>
            <option value="default">Streem-Default</option>
            <option value="chrono">Chronologisch</option>
            <option value="quality" selected>Qualität</option>
            <option value="calm">Ruhe-Modus</option>
            <option value="balance">Ausgleich</option>
          </select>
          <div class="battle-feed" id="battle-feed-right"></div>
        </section>
      </div>
      <p class="muted small">Die Karten sind die Top-5 jedes Setups. Beobachte: welcher Mensch redet wie viel? Welche Tonlagen verschwinden?</p>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#battle-close').onclick = close;
  const presets = battlePresets(currentRules);
  function render(side) {
    const sel = overlay.querySelector(`.battle-preset[data-side="${side}"]`);
    const target = overlay.querySelector(`#battle-feed-${side}`);
    const weights = presets[sel.value] || currentRules;
    const feed = buildFeed(POSTS, ADS, Store.data.userProfile, weights, {
      limit: 5, unlocked: ['ads'], muted: Store.data.userProfile.muted
    });
    target.innerHTML = '';
    for (const p of feed) {
      const c = getCharacter(p.author);
      const card = document.createElement('div');
      card.className = 'post-card battle-card';
      card.innerHTML = `
        <div class="post-head">
          <div class="name-block">
            <div class="name">${escapeHtml(c?.name || p.author)}</div>
            <div class="meta muted small">${escapeHtml(c?.handle || '')}</div>
          </div>
        </div>
        <div class="post-body">${escapeHtml(truncate(p.text || '', 140))}</div>
      `;
      target.appendChild(card);
    }
  }
  overlay.querySelectorAll('.battle-preset').forEach(sel => {
    sel.onchange = () => render(sel.dataset.side);
  });
  render('left');
  render('right');
}

function battlePresets(current) {
  return {
    default:   { ...Store.data.weights },
    quality:   { affinity: 0.3, engagement: 0.2, recency: 0.5, social: 0.3, ads: 0.2, diversity: 0.7, quality: 1.5, outragePenalty: 1.0, balance: 0.5 },
    chrono:    { affinity: 0.0, engagement: 0.0, recency: 1.8, social: 1.0, ads: 0.2, diversity: 0.0, quality: 0.2, outragePenalty: 0.0, balance: 0.0 },
    balance:   { affinity: 0.3, engagement: 0.2, recency: 0.5, social: 0.5, ads: 0.2, diversity: 0.8, quality: 0.8, outragePenalty: 0.8, balance: 1.5 },
    empoerung: { affinity: 0.4, engagement: 2.0, recency: 0.3, social: 0.4, ads: 0.6, diversity: 0.0, quality: 0.0, outragePenalty: 0.0, balance: 0.0 },
    calm:      { affinity: 0.6, engagement: 0.1, recency: 0.4, social: 0.7, ads: 0.1, diversity: 1.0, quality: 1.2, outragePenalty: 1.8, balance: 0.8 },
    custom:    current
  };
}

// Zeigt die aktuellen Slider als lesbaren Pseudo-Code-Algorithmus. Didaktisch:
// macht klar, dass „Algorithmus" letztlich eine gewichtete Summe ist.
function showPseudoCode(rules) {
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  const fmt = v => Number(v ?? 0).toFixed(2);
  const code = `// Streem-Algorithmus: dein aktuelles Setup.
// Für jeden Post wird ein Score berechnet — der höchste kommt oben.

function score(post, profile) {
  return (
    ${fmt(rules.affinity)}        * affinity(post, profile)        // wie sehr passt der Post zu deinen Interessen
  + ${fmt(rules.engagement)}      * engagementBoost(post)          // Likes/Empörung — wird belohnt
  + ${fmt(rules.recency)}         * recency(post)                  // wie neu ist der Post
  + ${fmt(rules.social)}          * followedBoost(post, profile)   // kommt von jemand, dem du folgst
  + ${fmt(rules.ads)}             * paidBoost(post, profile)       // bezahlte Anzeige?
  - ${fmt(rules.diversity)}       * diversityPenalty(post, recent) // doppelt vom gleichen Thema → Abzug
  + ${fmt(rules.quality)}         * qualityBonus(post)             // journalistische Qualität
  - ${fmt(rules.outragePenalty)}  * outrageScore(post)             // Empörungs-Strafe
  + ${fmt(rules.balance)}         * balanceBonus(post, profile)    // Gegen-Perspektive zur eigenen Neigung
  );
}

// Pro Woche: nimm die Top-N nach Score, mit kleiner Vielfalts-Korrektur.
const feed = sortByScoreDescending(allPosts).slice(0, 10);`;
  overlay.innerHTML = `
    <div class="tw-box pseudo-box">
      <header class="pseudo-head">
        <h3>Dein Algorithmus als Pseudo-Code</h3>
        <button class="btn btn-ghost btn-small" id="pseudo-close">Schließen</button>
      </header>
      <p class="muted small">Verschiebe die Slider in der Sandbox → die Zahlen hier oben ändern sich entsprechend.</p>
      <pre class="pseudo-code"><code>${escapeHtml(code)}</code></pre>
      <div class="tw-actions">
        <button class="btn btn-ghost" id="pseudo-copy">In Zwischenablage</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#pseudo-close').onclick = close;
  overlay.querySelector('#pseudo-copy').onclick = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        overlay.querySelector('#pseudo-copy').textContent = '✓ Kopiert';
      }).catch(() => {});
    }
  };
}

// Geführte Mini-Tour durch die Sandbox: 4 Stationen, jede mit einer
// kleinen Aufgabe und einer Reflexionsfrage. Macht aus „hier sind Slider"
// eine angeleitete Lerneinheit.
function runSandboxTour(rules, container) {
  Store.data.sandboxTourDone = true;
  Store.save();
  const stations = [
    {
      title: 'Station 1: Engagement maximieren',
      task: 'Schiebe den Engagement-Slider auf den Anschlag, alle anderen auf 0.',
      reflection: 'Was siehst du im Vorschau-Feed? Welche Posts kommen oben?',
      preset: { affinity: 0, engagement: 2, recency: 0, social: 0, ads: 0, diversity: 0, quality: 0, outragePenalty: 0, balance: 0 }
    },
    {
      title: 'Station 2: Chronologisch',
      task: 'Nur Aktualität zählt — der Rest ist 0.',
      reflection: 'Was fehlt am chronologischen Feed? Was gewinnst du, was verlierst du?',
      preset: { affinity: 0, engagement: 0, recency: 2, social: 0, ads: 0, diversity: 0, quality: 0, outragePenalty: 0, balance: 0 }
    },
    {
      title: 'Station 3: Qualität & Vielfalt',
      task: 'Schiebe Qualität und Vielfalt-Strafe nach oben, Empörungs-Strafe auch.',
      reflection: 'Wer redet jetzt? Wer redet weniger? Würdest du diesen Feed nutzen?',
      preset: { affinity: 0.3, engagement: 0.2, recency: 0.5, social: 0.3, ads: 0.2, diversity: 0.7, quality: 1.5, outragePenalty: 1.0, balance: 0.5 }
    },
    {
      title: 'Station 4: Gegen-Perspektive',
      task: 'Balance-Slider hoch. Das System belohnt Posts, die deiner Neigung entgegenstehen.',
      reflection: 'Was passiert mit deiner politischen Position über die simulierten 10 Wochen?',
      preset: { affinity: 0.3, engagement: 0.2, recency: 0.5, social: 0.5, ads: 0.2, diversity: 0.8, quality: 0.8, outragePenalty: 0.8, balance: 1.8 }
    }
  ];
  let idx = 0;
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  document.body.appendChild(overlay);
  const handle = attachModalLite(overlay);

  function render() {
    if (idx >= stations.length) {
      overlay.innerHTML = `
        <div class="tw-box" style="max-width:480px">
          <h3>Tour beendet.</h3>
          <p>Du hast vier Setups kennengelernt. Jetzt: schiebe selbst, kombiniere, speichere ein Preset, das du anderen vorschlagen würdest.</p>
          <p class="muted small">Jederzeit über „Geführte Tour starten" wiederholbar.</p>
          <button class="btn btn-primary" id="tour-finish">Verstanden</button>
        </div>
      `;
      overlay.querySelector('#tour-finish').onclick = () => handle.close();
      return;
    }
    const s = stations[idx];
    overlay.innerHTML = `
      <div class="tw-box" style="max-width:520px">
        <div class="muted small">Station ${idx + 1} / ${stations.length}</div>
        <h3>${escapeHtml(s.title)}</h3>
        <p><strong>Aufgabe:</strong> ${escapeHtml(s.task)}</p>
        <p class="muted small"><strong>Frag dich:</strong> ${escapeHtml(s.reflection)}</p>
        <div class="tw-actions">
          <button class="btn btn-ghost" id="tour-apply">Setup automatisch setzen</button>
          <button class="btn btn-primary" id="tour-next">Weiter</button>
        </div>
        <button class="btn btn-ghost btn-small" id="tour-skip" style="margin-top:8px">Tour überspringen</button>
      </div>
    `;
    overlay.querySelector('#tour-apply').onclick = () => {
      for (const [k, v] of Object.entries(s.preset)) {
        rules[k] = v;
        const slider = container.querySelector(`[data-slider="${k}"]`);
        const lbl = container.querySelector(`[data-key="${k}"]`);
        if (slider) slider.value = v;
        if (lbl) lbl.textContent = (+v).toFixed(2);
      }
      Store.data.sandboxRules = { ...rules };
      Store.save();
      previewFeed(rules);
    };
    overlay.querySelector('#tour-next').onclick = () => { idx++; render(); };
    overlay.querySelector('#tour-skip').onclick = () => handle.close();
  }
  render();
}

// Kleiner Lite-Modal-Helper, der nicht die volle Focus-Trap-Logik braucht
// (wir verlassen die Tour eh per Klick, nicht via Tab-Zyklus).
function attachModalLite(overlay) {
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  return { close };
}

function applyPreset(name, rules, container) {
  const presets = {
    current: { ...Store.data.weights },
    quality:    { affinity: 0.3, engagement: 0.2, recency: 0.5, social: 0.3, ads: 0.2, diversity: 0.7, quality: 1.5, outragePenalty: 1.0, balance: 0.5 },
    chrono:     { affinity: 0.0, engagement: 0.0, recency: 1.8, social: 1.0, ads: 0.2, diversity: 0.0, quality: 0.2, outragePenalty: 0.0, balance: 0.0 },
    balance:    { affinity: 0.3, engagement: 0.2, recency: 0.5, social: 0.5, ads: 0.2, diversity: 0.8, quality: 0.8, outragePenalty: 0.8, balance: 1.5 },
    empoerung:  { affinity: 0.4, engagement: 2.0, recency: 0.3, social: 0.4, ads: 0.6, diversity: 0.0, quality: 0.0, outragePenalty: 0.0, balance: 0.0 },
    calm:       { affinity: 0.6, engagement: 0.1, recency: 0.4, social: 0.7, ads: 0.1, diversity: 1.0, quality: 1.2, outragePenalty: 1.8, balance: 0.8 }
  };
  const p = presets[name];
  if (!p) return;
  for (const k of Object.keys(p)) {
    rules[k] = p[k];
    const slider = container.querySelector(`[data-slider="${k}"]`);
    const lbl = container.querySelector(`[data-key="${k}"]`);
    if (slider) slider.value = p[k];
    if (lbl) lbl.textContent = p[k].toFixed(2);
  }
  Store.data.sandboxRules = { ...rules };
  Store.save();
  previewFeed(rules);
}

function previewFeed(rules) {
  const feed = buildFeed(
    POSTS,
    ADS,
    Store.data.userProfile,
    rules,
    { limit: 6, unlocked: ['ads'], muted: Store.data.userProfile.muted }
  );
  const root = document.getElementById('sandbox-feed');
  root.innerHTML = '';
  for (const p of feed) {
    const c = getCharacter(p.author);
    const card = document.createElement('div');
    card.className = 'post-card';
    card.innerHTML = `
      <div class="post-head">
        <div class="name-block">
          <div class="name">${escapeHtml(c?.name || p.author)}</div>
          <div class="meta">${escapeHtml(c?.handle || '')}</div>
        </div>
      </div>
      <div class="post-body">${escapeHtml(truncate(p.text, 140))}</div>
    `;
    root.appendChild(card);
  }
}

function simulate(rules) {
  // Welches Profil als Ausgangspunkt? "current" = aktuelles Spielprofil, "fresh" = Start-Profil.
  const mode = document.querySelector('input[name=sim-mode]:checked')?.value || 'current';
  const baseSource = (mode === 'fresh' && Store.data.initialProfileSnapshot)
    ? Store.data.initialProfileSnapshot
    : Store.data.userProfile;
  const baseProfile = structuredClone(baseSource);
  const statsBefore = scoreProfile(baseProfile);

  // Parallel-Simulation: Original-Gewichte vs. eigene Regeln, damit der Vergleich sichtbar wird.
  const baselineWeights = Store.data.weights;
  const simOwn = structuredClone(baseProfile);
  const simOrig = structuredClone(baseProfile);
  for (let i = 0; i < 10; i++) {
    advanceSimWeek(simOwn, rules);
    advanceSimWeek(simOrig, baselineWeights);
  }
  const statsOwn = scoreProfile(simOwn);
  const statsOrig = scoreProfile(simOrig);

  const result = document.getElementById('sim-result');
  result.classList.add('visible');
  result.innerHTML = `
    <h4>Nach 10 simulierten Wochen — links Original-Algorithmus, rechts deine Regeln:</h4>
    <div class="sim-compare">
      ${renderCompareRow('Wissenschaft', statsBefore.wissenschaft, statsOrig.wissenschaft, statsOwn.wissenschaft)}
      ${renderCompareRow('Politik (rechts)', statsBefore.politikRechts, statsOrig.politikRechts, statsOwn.politikRechts)}
      ${renderCompareRow('Politik (links)', statsBefore.politikLinks, statsOrig.politikLinks, statsOwn.politikLinks)}
      ${renderCompareRow('Verschwörung', statsBefore.verschwoerung, statsOrig.verschwoerung, statsOwn.verschwoerung)}
      ${renderCompareRow('Vielfalt', statsBefore.diversity, statsOrig.diversity, statsOwn.diversity)}
    </div>
    <p class="muted small">Politische Neigung: Start ${statsBefore.lean.toFixed(2)} · Original ${statsOrig.lean.toFixed(2)} · deine Regeln <strong>${statsOwn.lean.toFixed(2)}</strong></p>
    <p class="muted small">Ausgangsbasis: ${mode === 'fresh' ? 'Start-Profil (vor dem Spiel)' : 'aktuelles Profil (nach den gespielten Wochen)'}.</p>
  `;
}

function advanceSimWeek(profile, weights) {
  const feed = buildFeed(POSTS, ADS, profile, weights, { limit: 10, unlocked: ['ads'], muted: [] });
  for (let j = 0; j < Math.min(3, feed.length); j++) {
    const p = feed[j];
    for (const t of p.tags || []) {
      profile.interests[t] = Math.min(1, (profile.interests[t] || 0) + 0.05);
    }
    if (p.political_lean !== undefined) {
      profile.political_lean_estimated = clamp(
        profile.political_lean_estimated + p.political_lean * 0.03, -1, 1
      );
    }
  }
}

function renderCompareRow(label, start, orig, own) {
  return `
    <div class="sim-row">
      <span class="lbl">${label}</span>
      <div class="sim-bars">
        <div class="sim-bar"><span class="sim-bar-label">Start</span><div class="bar small"><div class="fill base" style="width:${Math.round(start*100)}%"></div></div><span>${Math.round(start*100)}%</span></div>
        <div class="sim-bar"><span class="sim-bar-label">Original</span><div class="bar small"><div class="fill orig" style="width:${Math.round(orig*100)}%"></div></div><span>${Math.round(orig*100)}%</span></div>
        <div class="sim-bar"><span class="sim-bar-label">Du</span><div class="bar small"><div class="fill own" style="width:${Math.round(own*100)}%"></div></div><span>${Math.round(own*100)}%</span></div>
      </div>
    </div>`;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function scoreProfile(p) {
  const diversity = 1 - stddev(Object.values(p.interests));
  return {
    wissenschaft: p.interests.wissenschaft || 0,
    politikRechts: p.interests['politik-rechts'] || 0,
    politikLinks: p.interests['politik-links'] || 0,
    verschwoerung: p.interests.verschwoerung || 0,
    diversity: clamp(diversity, 0, 1),
    lean: p.political_lean_estimated
  };
}
function stddev(arr) {
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
  return Math.sqrt(v);
}

function truncate(s, n) {
  if (!s) return '';
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
