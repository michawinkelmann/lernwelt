// wrapped.js — Jahresrückblick im "Wrapped"-Stil.

import { Store } from './state.js';
import { buildSelfcheckCompareHtml } from './selfcheck.js';
import { downloadShareCard } from './sharecard.js';

let POSTS_LOOKUP = null;

export function setPostsLookup(posts) {
  POSTS_LOOKUP = new Map(posts.map(p => [p.id, p]));
}

/**
 * Analysiert die gespielte Historie und erzeugt Slides.
 */
export function buildWrapped() {
  const d = Store.data;
  const actions = d.history.flatMap(h => h.actions || []);
  const feedSeen = d.history.flatMap(h => h.feedSeen || []);

  // Top-Interessen
  const interests = { ...d.userProfile.interests };
  const topInterests = Object.entries(interests)
    .filter(([, v]) => v > 0.05)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topWord = topInterests[0] ? labelFor(topInterests[0][0]) : 'Lifestyle';

  // Anteil politischer Likes nach Richtung
  let leftActions = 0, rightActions = 0, totalPolitical = 0;
  for (const a of actions) {
    const post = POSTS_LOOKUP?.get(a.postId);
    if (!post) continue;
    const lean = post.political_lean || 0;
    if (Math.abs(lean) > 0.1 && ['like','comment','share','angry_comment'].includes(a.type)) {
      totalPolitical++;
      if (lean > 0) rightActions++;
      else leftActions++;
    }
  }
  const dominantShare = totalPolitical > 0
    ? Math.max(leftActions, rightActions) / totalPolitical
    : 0;

  // Rabbit-Hole-Pfad: Abfolge der dominanten Tags pro Woche
  const pathway = [];
  for (const h of d.history) {
    const counts = {};
    for (const a of h.actions || []) {
      const post = POSTS_LOOKUP?.get(a.postId);
      if (!post) continue;
      for (const t of post.tags || []) counts[t] = (counts[t] || 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top) pathway.push({ week: h.week, tag: top[0] });
  }

  // „Werbeprofil"
  const adProfile = generateAdProfile(topInterests, d.userProfile);

  // Was wurde NICHT gezeigt? (gegenteilige Richtung)
  const missed = generateMissedList(d.userProfile, feedSeen);

  // Screen-Time
  const totalActions = actions.length;
  const estimatedMinutes = totalActions * 2.3 + d.history.length * 5;

  // Zeit mit Warnhinweisen
  const twStats = d.contentWarningsAccepted || {};
  const twShown = Object.values(twStats).reduce((a, b) => a + (b.shown || 0), 0);
  const twSkipped = Object.values(twStats).reduce((a, b) => a + (b.skipped || 0), 0);

  // Eigene Posts
  const ownCount = d.ownPosts.length;

  // Lean-Score
  const lean = d.userProfile.political_lean_estimated;

  return [
    {
      id: 's1',
      html: `
        <h1>Dein Streem-Rückblick</h1>
        <p>Ein halbes Jahr. ${d.history.length} Aktionen. Tausende Entscheidungen. Los.</p>
      `
    },
    {
      id: 's2',
      html: `
        <h2>Dein Jahres-Wort</h2>
        <div class="big-word">${escapeHtml(topWord)}</div>
        <p>Dein Feed wurde von diesem Thema dominiert.</p>
      `
    },
    {
      id: 's3',
      html: `
        <h2>Deine Top-Interessen laut Algorithmus</h2>
        <div class="wrapped-bars">
          ${topInterests.map(([k, v]) => `
            <div class="row">
              <span class="lbl">${escapeHtml(labelFor(k))}</span>
              <div class="bar"><div class="fill" style="width:${Math.round(v*100)}%"></div></div>
              <span>${Math.round(v*100)}%</span>
            </div>
          `).join('')}
        </div>
        <p class="muted small">Das System hat aus ${actions.length} Interaktionen gelernt.</p>
      `
    },
    {
      id: 's4',
      html: `
        <h2>Dein Echokammer-Score</h2>
        ${totalPolitical === 0
          ? `<div class="big-word">—</div>
             <p>Du hast politisch kaum interagiert. Sehr bewusst beobachtet — oder bewusst gemieden?</p>`
          : `<div class="big-num">${Math.round(dominantShare * 100)}%</div>
             <p>${dominantShare > 0.7
               ? 'deiner politischen Likes gingen in eine einzige Richtung.'
               : dominantShare > 0.5
               ? 'deiner politischen Likes gingen in eine dominante Richtung.'
               : 'deiner politischen Likes waren über Richtungen verteilt.'}</p>`}
        <div class="wrapped-lean">
          <div class="lean-track"><div class="lean-dot" style="left:${Math.round((lean+1)*50)}%"></div></div>
          <div class="labels"><span>links</span><span>Mitte</span><span>rechts</span></div>
        </div>
        <p class="muted small">${totalPolitical} politische Interaktionen insgesamt.</p>
      `
    },
    {
      id: 's5',
      html: `
        <h2>Dein Pfad durchs Rabbit Hole</h2>
        <div class="wrapped-pathway">
          <div class="pathway-line">
            ${pathway.map((p, i) => `
              <span class="pathway-node ${isRadical(p.tag) ? 'radical' : ''}">W${p.week} · ${escapeHtml(labelFor(p.tag))}</span>
              ${i < pathway.length - 1 ? '<span class="pathway-arrow">→</span>' : ''}
            `).join('')}
          </div>
        </div>
        <p class="muted small">Jedes Kästchen ist das Thema, auf das du in dieser Woche am meisten reagiert hast.</p>
      `
    },
    buildBeatMapSlide(d),
    {
      id: 's6',
      html: `
        <h2>Wer der Algorithmus denkt, dass du bist</h2>
        <div class="wrapped-ads">
          <div class="ad-label">Werbeprofil · für Anzeigenkunden</div>
          <ul>
            ${adProfile.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
          </ul>
        </div>
        <p class="muted small">So würde ein Werbetreibender dich ansprechen.</p>
      `
    },
    {
      id: 's7',
      html: `
        <h2>Was du nicht gesehen hast</h2>
        <div class="wrapped-missed">
          ${missed.map(m => `<div class="card"><strong>${escapeHtml(m.title)}</strong><br/>${escapeHtml(m.desc)}</div>`).join('')}
        </div>
        <p class="muted small">Diese Themen und Perspektiven hat dein Feed dir selten gezeigt.</p>
      `
    },
    {
      id: 's8',
      html: `
        <h2>Deine Streem-Zeit</h2>
        <div class="big-num">${Math.round(estimatedMinutes)} min</div>
        <p>Ungefähr auf der App verbracht. ${ownCount} eigene Posts. ${twShown} Inhaltswarnungen angeschaut, ${twSkipped} übersprungen.</p>
      `
    },
    buildMissedStoriesSlide(d),
    {
      id: 's8e',
      html: `
        <h2>Vorher und nachher — du selbst</h2>
        <p>Wie unterschiedlich siehst du dieselben fünf Fragen am Anfang und am Ende des Spiels?</p>
        ${buildSelfcheckCompareHtml()}
      `
    },
    buildEndingSlide(d),
    buildWhatIfSlide(d),
    buildNpcPerspectivesSlide(d),
    {
      id: 's9',
      html: `
        <h2>Und jetzt?</h2>
        <p>Du hast gerade gesehen, wie ein Algorithmus dich ausliest, gewichtet und zurückspielt.</p>
        <p>Das Spiel ist nicht echt. Die Mechanik ist es.</p>
        <div class="wrapped-final-actions">
          <button class="btn btn-primary" id="btn-go-sandbox">Dein eigener Algorithmus →</button>
          <button class="btn btn-ghost" id="btn-go-manifest">Medien-Manifest →</button>
          <button class="btn btn-ghost" id="btn-share-card">Als Bild teilen 📸</button>
          <button class="btn btn-ghost" id="btn-wrapped-html">Wrapped als HTML speichern</button>
        </div>
        <p class="muted small" style="margin-top:14px">„Teilen" lädt eine PNG-Datei zum Speichern. Ob du sie in einer echten App postest — entscheidet dein Algorithmus.</p>
      `
    }
  ];
}

// Multiple Endings — datengetrieben aus dem finalen Profil und der Spielhistorie.
// Pro Ending eine kleine kuratierte Quellen-Liste — echte Anlaufstellen,
// die zum Thema des Endings passen. Macht aus „du hast jetzt erlebt …"
// einen konkreten Anschluss-Schritt.
const ENDING_SOURCES = {
  finn_lost: [
    { label: 'beratung-gegen-rechtsextremismus.de', what: 'wenn jemand in deinem Umfeld abdriftet' },
    { label: 'jugendschutz.net', what: 'Meldestelle für extremistische und jugendgefährdende Inhalte' },
    { label: 'bpb.de — Reihe „Was tun gegen Rechtsextremismus"', what: 'Hintergrund + Handlungsoptionen' }
  ],
  finn_saved: [
    { label: 'bpb.de — Radikalisierungsprävention', what: 'was hat hier geholfen, was hilft strukturell' },
    { label: 'klicksafe.de — „Hass im Netz"', what: 'wie du andere unterstützen kannst' }
  ],
  rabbithole: [
    { label: 'exit-deutschland.de', what: 'Ausstiegshilfe aus extremistischen Szenen' },
    { label: 'beratung-gegen-rechtsextremismus.de', what: 'auch für Angehörige' },
    { label: 'Telefonseelsorge 0800 111 0 111', what: 'wenn dir nach dem Spiel etwas hängenbleibt' }
  ],
  allyship: [
    { label: 'hateaid.org', what: 'rechtliche und psychologische Unterstützung bei digitaler Gewalt' },
    { label: 'fearlessdemocracy.org', what: 'Hate-Speech erkennen und melden' },
    { label: 'bpb.de — „Antifeminismus erkennen"', what: 'Hintergrund zu Mustern, die du gesehen hast' }
  ],
  aware: [
    { label: 'bpb.de — „Wie funktionieren Algorithmen?"', what: 'die Mechanik, die du im Spiel ausgestellt gesehen hast' },
    { label: 'klicksafe.de — „Algorithmen verstehen"', what: 'Material für Schule und für dich selbst' },
    { label: 'algorithmwatch.org', what: 'forscht und berichtet zu algorithmischer Macht' }
  ],
  influencer: [
    { label: 'klicksafe.de — „Reichweite und Verantwortung"', what: 'was sollte ich beachten, wenn ich poste' },
    { label: 'hateaid.org', what: 'Schutz vor Pile-Ons' }
  ],
  crusader: [
    { label: 'bpb.de — „Wie diskutieren wir online?"', what: 'Gesprächsführung statt Empörung' },
    { label: 'klicksafe.de — „Mein digitaler Fußabdruck"', what: 'was bleibt online?' }
  ],
  guarded: [
    { label: 'klicksafe.de — „Selbstschutz online"', what: 'Werkzeuge für die eigene Aufmerksamkeit' },
    { label: 'bpb.de — Medienkompetenz', what: 'tiefer einsteigen' }
  ],
  nerd: [
    { label: 'algorithmwatch.org', what: 'wissenschaftlich-kritische Sicht auf Plattformen' },
    { label: 'iqo.uni-hannover.de — Open Science', what: 'Studien lesen, bevor du Schlagzeilen teilst' }
  ],
  driven: [
    { label: 'klicksafe.de', what: 'Erste Anlaufstelle für sicheren Umgang mit Social Media' },
    { label: 'bpb.de — „Politische Bildung digital"', what: 'einordnen, was dein Feed dir gezeigt hat' }
  ]
};

// Stories, die der User während des Spiels NICHT angeklickt hat.
// Pädagogisch wertvoll: zeigt, wie Stories ablaufen, ohne dass man's merkt.
function buildMissedStoriesSlide(d) {
  const viewed = d.storiesViewed || {};
  const all = (window.__DATA_STORIES?.stories || []);
  const missed = all.filter(s => s.week <= d.currentWeek && !viewed[s.id]);
  const totalSeen = all.filter(s => s.week <= d.currentWeek && viewed[s.id]).length;
  const total = all.filter(s => s.week <= d.currentWeek).length;
  if (!total) {
    return {
      id: 's8c',
      html: `<h2>Stories</h2><p>Keine Stories gespielt. Macht nichts — die meisten verschwinden eh nach 24 Stunden.</p>`
    };
  }
  const pct = Math.round(totalSeen / total * 100);
  const samples = missed.slice(0, 4);
  return {
    id: 's8c',
    html: `
      <h2>Stories: was du nicht gesehen hast</h2>
      <div class="big-num">${missed.length}</div>
      <p>Stories sind nach einer Woche weg — du hast ${totalSeen} von ${total} angeklickt (${pct} %). Plattformen nutzen genau diesen Verschwindeeffekt, um dich öfter zurückzuholen.</p>
      ${samples.length ? `<div class="missed-stories">
        ${samples.map(s => `<div class="missed-story"><span class="missed-emoji">${escapeHtml(s.emoji || '·')}</span><span class="muted small">W${s.week}</span><span>${escapeHtml(s.text)}</span></div>`).join('')}
      </div>` : ''}
    `
  };
}

// Beat-Map: visuelle 26-Wochen-Übersicht. Pro Woche eine kleine Marke mit
// Aktivitätsdichte und ggf. Highlight-Icon (Shitstorm, Gilden-Beitritt,
// Wahl, Hate-Incident, Mikro-Reflexion).
function buildBeatMapSlide(d) {
  const history = d.history || [];
  const ownPosts = d.ownPosts || [];
  const shitstorms = d.shitstormHistory || [];
  const microRefs = d.microReflections || {};
  const dmReplies = d.dmReplies || {};
  const guildReact = d.guildReactions || {};
  const electionVote = d.electionVote;
  const totalWeeks = Math.max(history.length + 1, d.currentWeek + 1, 27);
  // Pro Woche markante Ereignisse erfassen.
  const events = {};
  for (let w = 0; w < totalWeeks; w++) events[w] = [];
  for (const s of shitstorms) (events[s.week] ||= []).push({ emoji: '🔥', label: 'Shitstorm' });
  for (const op of ownPosts) (events[op.week] ||= []).push({ emoji: '✍️', label: 'eigener Post' });
  for (const [key, info] of Object.entries(microRefs)) (events[info.week] ||= []).push({ emoji: '🪞', label: 'Mikro-Reflexion' });
  for (const [thread, perWeek] of Object.entries(dmReplies)) {
    for (const w of Object.keys(perWeek)) (events[+w] ||= []).push({ emoji: '💬', label: 'DM-Antwort' });
  }
  for (const [guildId, list] of Object.entries(guildReact)) {
    for (const r of list || []) (events[r.week] ||= []).push({ emoji: '🛖', label: 'Gilden-Reaktion' });
  }
  if (electionVote != null) (events[22] ||= []).push({ emoji: '🗳️', label: 'Wahl' });
  // Aktivitätsdichte pro Woche.
  function densityFor(w) {
    const h = history[w];
    return h ? (h.actions || []).length : 0;
  }
  const maxDensity = Math.max(1, ...history.map(h => (h.actions || []).length));
  const cells = [];
  for (let w = 0; w < totalWeeks; w++) {
    const d2 = densityFor(w);
    const intensity = d2 / maxDensity; // 0..1
    const evs = events[w] || [];
    cells.push(`
      <div class="beat-cell" style="opacity:${0.25 + intensity * 0.75}">
        <div class="beat-num">${w}</div>
        ${evs.length ? `<div class="beat-icons" title="${evs.map(e => e.label).join(', ')}">${evs.slice(0, 3).map(e => `<span aria-label="${e.label}">${e.emoji}</span>`).join('')}</div>` : ''}
      </div>
    `);
  }
  return {
    id: 's5b',
    html: `
      <h2>Deine 26 Wochen — Beat-Map</h2>
      <p class="muted small">Pro Woche: Helligkeit zeigt Aktivität, Icons markieren Pivot-Momente (🔥 Shitstorm, ✍️ eigener Post, 💬 DM-Antwort, 🛖 Gilden-Reaktion, 🗳️ Wahl, 🪞 Mikro-Reflexion).</p>
      <div class="beat-map">${cells.join('')}</div>
    `
  };
}

// Pivot-Entscheidungen: nur die, die im computeEnding wirklich Gewicht haben.
const WHATIF_PIVOTS = [
  { key: 'finn8',  thread: 'dm_finn',  week: 8,
    label: 'Finn (W8): „Ehrlich, die Mädels in Gaming-Streams sind nur Clout-Chaser"',
    choices: {
      pushback: { label: 'Widersprochen',  arc: { finn_path: -1 } },
      curious:  { label: 'Nachgefragt',    arc: { finn_path: 0 } },
      agree:    { label: 'Zugestimmt',     arc: { finn_path: 1 } }
    },
    extract: id => id?.replace('finn_8_', '') },
  { key: 'finn17', thread: 'dm_finn',  week: 17,
    label: 'Finn (W17): „Ich war beim Echte-Werte-Treffen, die hören wenigstens zu"',
    choices: {
      warn:    { label: 'Warnung',        arc: { finn_path: -2 } },
      neutral: { label: 'Vorsicht',       arc: { finn_path: -1 } },
      join:    { label: '„Erzähl mehr"',  arc: { finn_path: 2 } }
    },
    extract: id => id?.replace('finn_17_', '') },
  { key: 'lea14',  thread: 'dm_lea',   week: 14,
    label: 'Lea (W14): „Du wirkst irgendwie anders in letzter Zeit"',
    choices: {
      open:      { label: '„Der Feed macht was mit mir"',  arc: { lea_close: 0.4, self_aware: 1 } },
      deflect:   { label: '„Stress halt"',                  arc: { lea_close: -0.1 } },
      defensive: { label: '„Wie meinst du das?"',           arc: { lea_close: 0 } }
    },
    extract: id => id?.replace('lea_14_', '') },
  { key: 'mira15', thread: 'dm_mira',  week: 15,
    label: 'Mira (W15): Bitte um Reality-Check nach Hate-Welle',
    choices: {
      support:  { label: 'Empathie',                arc: { mira_close: 0.3 } },
      advice:   { label: 'Praktischer Rat',         arc: { mira_close: 0.2 } },
      distance: { label: '„Weniger provozieren"',   arc: { mira_close: -0.3 } }
    },
    extract: id => id?.replace('mira_15_', '') }
];

// Schätzt, welches Ending bei alternativen npcArcs herauskäme.
// Profil bleibt sonst wie gehabt — wir tauschen nur den entsprechenden Arc-Wert.
function endingForArcs(d, arcOverrides) {
  const fake = { ...d, npcArcs: { ...(d.npcArcs || {}), ...arcOverrides } };
  return computeEnding(fake);
}

// NPC-Reflexionen: was würde Lea / Finn / Mira / Tariq / Lara / Marc über
// den User sagen, basierend auf seinen Arc-Werten und DM-Antworten? Macht
// die NPC-Beziehungen am Ende emotional fassbar.
function buildNpcPerspectivesSlide(d) {
  const arcs = d.npcArcs || {};
  const dm = d.dmReplies || {};
  const lines = [];

  // Lea
  const leaClose = arcs.lea_close || 0;
  if (leaClose >= 0.5) lines.push({ name: 'Lea', text: '„Du warst ehrlich, als ich gefragt hab. Das ist mehr, als die meisten machen."' });
  else if (leaClose <= -0.1) lines.push({ name: 'Lea', text: '„Du bist irgendwie verschwunden. Schade."' });
  else lines.push({ name: 'Lea', text: '„Wir haben uns ein paar Mal getroffen. Schön gewesen."' });

  // Finn
  const finnPath = arcs.finn_path || 0;
  if (finnPath >= 3) lines.push({ name: 'Finn', text: '„Ich hab jetzt Leute, die mir zuhören. Du gehörtest nie dazu."' });
  else if (finnPath <= -2) lines.push({ name: 'Finn', text: '„Du hast mir mal gesagt, das sei Quatsch. Ich war wütend. Jetzt bin ich dankbar."' });
  else lines.push({ name: 'Finn', text: '„Du warst da. Manchmal. Was hätte ich mir noch wünschen sollen."' });

  // Mira
  const miraClose = arcs.mira_close || 0;
  if (miraClose >= 0.4) lines.push({ name: 'Mira', text: '„Ich hab nicht viele gefragt. Dass du da warst, hab ich gemerkt."' });
  else if (miraClose <= -0.2) lines.push({ name: 'Mira', text: '„Du fandest, ich übertreibe. Vielleicht hast du recht. Vielleicht auch nicht."' });

  // Marc
  const marcChoice = dm.dm_marc?.[11]?.id;
  if (marcChoice === 'marc_join') lines.push({ name: 'Marc Stay-Based', text: '„Du bist dabei. Das vergisst man nicht."' });
  else if (marcChoice === 'marc_block') lines.push({ name: 'Marc Stay-Based', text: '„Wieder einer, der nicht versteht. Stark, dass du blockierst."' });
  else if (marcChoice === 'marc_curious') lines.push({ name: 'Marc Stay-Based', text: '„Du hast nachgefragt. Halb dabei ist halb nicht dabei. Schwach."' });

  // Lara
  const laraChoice = dm.dm_lara?.[24]?.id;
  if (laraChoice === 'lara_24_solidarity') lines.push({ name: 'Lara Weiss', text: '„Du hast mir geschrieben. Danke. Das hat in der Woche gereicht."' });
  else if (laraChoice === 'lara_24_silence') lines.push({ name: 'Lara Weiss', text: '„Schweigen war gerade das Lauteste. Ich nehm das nicht persönlich, aber ich merk es."' });

  // Tariq (wenn DM beantwortet)
  const tariqChoice = dm.dm_tariq?.[13]?.id;
  if (tariqChoice === 'tariq_13_check') lines.push({ name: 'Tariq', text: '„Du hast aufgehört, vor dem Teilen zu klicken. Hat mir was über dich gesagt."' });

  if (!lines.length) {
    return {
      id: 's_npcperspect',
      html: `
        <h2>Was die anderen sagen würden</h2>
        <p>Du hast die Nähe zu wenigen aufgebaut. Vielleicht ein Spielzug fürs nächste Mal: in Streem ist das Teurer als gedacht — und gibt mehr zurück, als man denkt.</p>
      `
    };
  }
  return {
    id: 's_npcperspect',
    html: `
      <h2>Was die anderen sagen würden</h2>
      <p>Wenn man Lea, Finn, Mira (und andere) am Spielende fragen würde — so käme es vielleicht zurück:</p>
      <div class="npc-quotes">
        ${lines.map(l => `<div class="npc-quote"><div class="npc-quote-name">${escapeHtml(l.name)}</div><div class="npc-quote-text">${escapeHtml(l.text)}</div></div>`).join('')}
      </div>
    `
  };
}

function buildWhatIfSlide(d) {
  const dmReplies = d.dmReplies || {};
  const arcs = d.npcArcs || {};
  // Welche Pivots hat der User überhaupt gespielt?
  const pivotsPlayed = WHATIF_PIVOTS.map(p => {
    const id = dmReplies[p.thread]?.[p.week]?.id;
    const choice = id ? p.extract(id) : null;
    return { ...p, chosen: choice };
  }).filter(p => p.chosen);

  if (!pivotsPlayed.length) {
    return {
      id: 's8d',
      html: `<h2>Hätte ich anders entschieden?</h2><p>Du hast diesmal kaum DM-Entscheidungen getroffen — die meisten Pivots laufen über die DMs. In einem zweiten Durchlauf hättest du da mehr zu entscheiden.</p>`
    };
  }

  const currentEnding = computeEnding(d);
  // Pro Pivot: für jede alternative Wahl berechnen, wie das Ending wäre.
  const cards = pivotsPlayed.map(p => {
    const alternatives = Object.entries(p.choices)
      .filter(([k]) => k !== p.chosen)
      .map(([altKey, alt]) => {
        // Differenz zum aktuell-gewählten Arc.
        const cur = p.choices[p.chosen]?.arc || {};
        const altArcs = {};
        for (const [k, v] of Object.entries({ ...cur, ...alt.arc })) {
          const curV = cur[k] || 0;
          const altV = alt.arc[k] || 0;
          // Verschiebung anwenden, basierend auf bestehendem Arc-Wert.
          altArcs[k] = (arcs[k] || 0) - curV + altV;
        }
        const altEnding = endingForArcs(d, altArcs);
        return { altKey, label: alt.label, ending: altEnding };
      });
    const chosenLabel = p.choices[p.chosen]?.label || p.chosen;
    return `
      <div class="whatif-pivot">
        <div class="whatif-pivot-q">${escapeHtml(p.label)}</div>
        <div class="whatif-row">
          <div class="whatif-cell chosen">
            <div class="whatif-cell-tag">deine Wahl</div>
            <div class="whatif-cell-label">${escapeHtml(chosenLabel)}</div>
            <div class="whatif-cell-ending">${currentEnding.emoji} ${escapeHtml(currentEnding.title)}</div>
          </div>
          ${alternatives.map(a => `
            <div class="whatif-cell alt ${a.ending.key === currentEnding.key ? 'same' : 'diff'}">
              <div class="whatif-cell-tag">stattdessen</div>
              <div class="whatif-cell-label">${escapeHtml(a.label)}</div>
              <div class="whatif-cell-ending">${a.ending.emoji} ${escapeHtml(a.ending.title)}${a.ending.key === currentEnding.key ? ' <span class="muted small">(gleich)</span>' : ''}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  return {
    id: 's8d',
    html: `
      <h2>Hätte ich anders entschieden?</h2>
      <p>Hier siehst du, wo deine Antworten den Ausgang prägten. Manche Pivots hätten dich in einen ganz anderen Bogen geführt.</p>
      <div class="whatif-grid">${cards}</div>
      <p class="muted small">Diese Schätzung beruht nur auf den eingespielten Pivots — der Rest des Spielverlaufs bleibt unverändert.</p>
    `
  };
}

function buildEndingSlide(d) {
  const e = computeEnding(d);
  d.ending = e.key;
  const sources = ENDING_SOURCES[e.key] || ENDING_SOURCES.driven;
  const sourceList = `
    <div class="ending-sources">
      <div class="ending-sources-head">Wenn dich das Thema weiter beschäftigt:</div>
      <ul>
        ${sources.map(s => `<li><strong>${escapeHtml(s.label)}</strong><br/><span class="muted small">${escapeHtml(s.what)}</span></li>`).join('')}
      </ul>
    </div>
  `;
  return {
    id: 's8b',
    html: `
      <h2>Dein Streem-Bogen</h2>
      <div class="ending-card ending-${e.key}">
        <div class="ending-emoji">${e.emoji}</div>
        <div class="ending-title">${escapeHtml(e.title)}</div>
        <p>${escapeHtml(e.text)}</p>
        <div class="ending-stats muted small">
          ${e.facts.map(f => `<div>${escapeHtml(f)}</div>`).join('')}
        </div>
        ${sourceList}
      </div>
      <p class="muted small">Dieses Ergebnis hängt von deinen Entscheidungen ab — andere Spielzüge führen zu anderen Bögen.</p>
    `
  };
}

function computeEnding(d) {
  const p = d.userProfile || {};
  const actions = (d.history || []).flatMap(h => h.actions || []);
  const angry = actions.filter(a => a.type === 'angry_comment').length;
  const likes = actions.filter(a => a.type === 'like').length;
  const ownPosts = (d.ownPosts || []).length;
  const rabbitGuilds = (d.guildMemberships || []).filter(g => g === 'echte_werte' || g === 'spurensuche_gh');
  const inRabbit = rabbitGuilds.length > 0;
  const rabbitGuildName = rabbitGuilds.includes('echte_werte') ? 'Echte Werte' : 'Spurensuche Greifshafen';
  const inReading = (d.guildMemberships || []).includes('lese_runde');
  const followers = (p.followed || []).length;
  const muted = (p.muted || []).length;
  const lean = p.political_lean_estimated || 0;
  const verschw = p.interests?.verschwoerung || 0;
  const tw = d.contentWarningsAccepted || {};
  const twSkip = Object.values(tw).reduce((a, b) => a + (b.skipped || 0), 0);
  const arcs = d.npcArcs || {};
  const leaClose  = arcs.lea_close || 0;
  const finnPath  = arcs.finn_path || 0;
  const miraClose = arcs.mira_close || 0;
  const selfAware = arcs.self_aware || 0;

  // NPC-Arc-Endings haben Priorität, wenn sie eindeutig sind.
  if (finnPath >= 3) {
    return {
      key: 'finn_lost',
      emoji: '🕳️',
      title: 'Finn ist abgerutscht',
      text: 'Du hast Finn auf seinem Weg in die radikale Gilde nicht aufgehalten — vielleicht warst du auch dort. In W24 hat er nicht widersprochen, als jemand Lara Weiss beleidigt wurde. Du hast es gesehen. Du warst nicht der Grund, aber du warst ein Teil der Stimmung.',
      facts: [`Finn-Bahn: +${finnPath} (in Richtung radikal)`, inRabbit ? 'eigene Mitgliedschaft: Echte Werte' : 'Finn radikalisiert, du nicht', `Hass-Affinität: ${Math.round((p.interests?.hass||0)*100)}%`]
    };
  }
  if (finnPath <= -3) {
    return {
      key: 'finn_saved',
      emoji: '🪢',
      title: 'Du hast Finn gehalten',
      text: 'In Woche 8 hast du widersprochen, als Finn anfing, von Clout-Chaser-Mädels zu reden. In Woche 17 hast du ihn vor der Gilde gewarnt. Es klingt klein, ist aber genau das, was im Echten Radikalisierung verhindert: jemand, der „hey, nein" sagt — bevor es Routine wird.',
      facts: [`Finn-Bahn: ${finnPath} (in Richtung zurückgeholt)`, `selbst nicht in „Echte Werte"`, `${ownPosts} eigene Posts geschrieben`]
    };
  }
  if (leaClose >= 0.6 && selfAware >= 1) {
    return {
      key: 'aware',
      emoji: '🪞',
      title: 'Selbstbewusst durch den Feed',
      text: 'Du hast Lea zugehört, ihr im richtigen Moment ehrlich geantwortet, dass dieser Feed etwas mit dir macht. Diese Bewegung — Reflexion *während* des Scrollens, nicht erst danach — ist die schwierigste und seltenste in diesem Spiel.',
      facts: [`Lea-Nähe: ${leaClose.toFixed(2)}`, `du hast eingestanden, was Algorithmen mit dir machen`, `Lean stabil bei ${lean.toFixed(2)}`]
    };
  }
  if (miraClose >= 0.4 && (p.interests?.feminismus || 0) > 0.3) {
    return {
      key: 'allyship',
      emoji: '🤝',
      title: 'Verbündete:r',
      text: 'Mira hat dich nach Hass-Kommentaren um einen Reality-Check gebeten. Du warst da. Allyship ist nicht groß, sie ist diese kurze DM, die ankommt, wenn es nötig ist.',
      facts: [`Mira-Nähe: ${miraClose.toFixed(2)}`, `Feminismus-Affinität: ${Math.round((p.interests?.feminismus||0)*100)}%`, `${angry} wütende Kommentare`]
    };
  }
  // Prioritäten-Logik: das eindeutigste Profil gewinnt.
  if (inRabbit && (verschw > 0.4 || lean > 0.55)) {
    return {
      key: 'rabbithole',
      emoji: '🕳️',
      title: 'Tief im Loch',
      text: 'Du bist in einer Gilde gelandet, die dich nicht mehr loslässt. Dein Feed zeigt dir, dass du recht hast — immer. Das ist die Mechanik, die Radikalisierung im Echten ausmacht. Du hast es im Spiel erlebt; und auch wieder verlassen.',
      facts: [`politische Neigung: ${lean.toFixed(2)}`, `Verschwörungs-Affinität: ${Math.round(verschw*100)}%`, `Gilden-Mitgliedschaft: ${rabbitGuildName}`]
    };
  }
  if (ownPosts >= 6 && followers >= 8) {
    return {
      key: 'influencer',
      emoji: '📣',
      title: 'Mikro-Influencer:in',
      text: 'Du hast viel selbst gepostet. Reichweite kostet aber etwas — du hast gemerkt, wie schnell ein Post entgleist, wie schnell sich Erwartungen aufbauen. Wer Plattform mit-baut, mit-baut sie auch in seinem Kopf.',
      facts: [`${ownPosts} eigene Posts`, `${followers} gefolgte Accounts`, `${likes} verteilte Likes`]
    };
  }
  if (angry >= 8 && Math.abs(lean) > 0.4) {
    return {
      key: 'crusader',
      emoji: '⚔️',
      title: 'Empörte:r Engagierte:r',
      text: 'Du hast eine klare Haltung — und sie laut gemacht. Wütende Kommentare bringen Reichweite, sie verändern aber selten Meinungen. Frag dich, ob dein Algorithmus dich klüger gemacht hat oder lauter.',
      facts: [`${angry} wütende Kommentare`, `Lean: ${lean.toFixed(2)}`, `${muted} stummgeschaltete Accounts`]
    };
  }
  if (twSkip >= 4 && muted >= 3 && Math.abs(lean) < 0.3) {
    return {
      key: 'guarded',
      emoji: '🛡️',
      title: 'Achtsame:r Beobachter:in',
      text: 'Du hast Inhalte übersprungen, Accounts stummgeschaltet, dich politisch nicht in eine Ecke drängen lassen. Diese Selbst-Moderation ist eine Fähigkeit, die in keinem Schulplan steht — du hast sie jetzt geübt.',
      facts: [`${twSkip} Inhaltswarnungen übersprungen`, `${muted} Accounts stumm`, `Lean stabil bei ${lean.toFixed(2)}`]
    };
  }
  if (inReading && p.interests?.wissenschaft > 0.4) {
    return {
      key: 'nerd',
      emoji: '📚',
      title: 'Quelle vor Meinung',
      text: 'Du hast Zeit in der Leserunde verbracht, lange Texte konsumiert, Studien geteilt. Dein Feed wurde dadurch ruhiger — und auch enger. Wissenschaftliches Lesen ist Filterblase, nur eine angenehmere.',
      facts: [`Wissenschafts-Affinität: ${Math.round((p.interests?.wissenschaft||0)*100)}%`, `Gilde: Leserunde 2028`]
    };
  }
  // Fallback-Aware: self_aware ohne hohe Lea-Nähe (das stärkere Aware-Ending
  // oben verlangt beides — Reflexionsgespräch + Beziehungspflege).
  if (selfAware >= 1 && twSkip < 3) {
    return {
      key: 'aware',
      emoji: '🪞',
      title: 'Selbstbewusst durch den Feed',
      text: 'Du hast dir selbst zugehört. Lea zu sagen, dass dieser Feed etwas mit dir macht — das ist die schwierigste Bewegung des Spiels. Reflexion *während* des Scrollens, nicht erst danach.',
      facts: [`du hast eingestanden, was Algorithmen mit dir machen — das ist die seltenste Reaktion in diesem Spiel.`]
    };
  }
  return {
    key: 'driven',
    emoji: '🌊',
    title: 'Mitgetrieben',
    text: 'Dein Account ist mit dem Feed mitgegangen — wie die meisten echten Accounts. Keine extremen Ausschläge, keine bewussten Brüche. Genau diese ruhige Drift ist das, was Algorithmen so effektiv macht: niemand merkt, wie sich etwas verschoben hat.',
    facts: [`${likes} Likes verteilt`, `Lean: ${lean.toFixed(2)}`, `${followers} gefolgte Accounts`]
  };
}

function labelFor(tag) {
  const m = {
    gaming: 'Gaming',
    'politik-links': 'Politik (links)',
    'politik-rechts': 'Politik (rechts)',
    'politik-mitte': 'Politik (Mitte)',
    lifestyle: 'Lifestyle',
    wissenschaft: 'Wissenschaft',
    verschwoerung: 'Verschwörung',
    humor: 'Humor',
    hass: 'Hass',
    feminismus: 'Feminismus',
    'anti-feminismus': 'Anti-Feminismus',
    musik: 'Musik',
    sport: 'Sport',
    klima: 'Klima',
    'true-crime': 'True Crime'
  };
  return m[tag] || tag;
}

function isRadical(tag) {
  return ['politik-rechts','verschwoerung','hass','anti-feminismus'].includes(tag);
}

function generateAdProfile(topInterests, profile) {
  const lines = [];
  const lean = profile.political_lean_estimated;
  if (lean > 0.35) lines.push('politisch: konservativ bis rechts');
  else if (lean < -0.35) lines.push('politisch: progressiv bis links');
  else lines.push('politisch: Mitte');

  if (profile.interests['gaming'] > 0.3) lines.push('Zielgruppe: Gaming');
  if (profile.interests['klima'] > 0.3) lines.push('affin für: Nachhaltigkeit');
  if (profile.interests['verschwoerung'] > 0.2) lines.push('empfänglich für: „alternative Erklärungen"');
  if (profile.interests['anti-feminismus'] > 0.2) lines.push('empfänglich für: Männer-Coaching-Angebote');
  if (profile.interests['feminismus'] > 0.3) lines.push('affin für: progressive Marken, Diversity');
  if (profile.interests['lifestyle'] > 0.4) lines.push('hoher Konsumindex');
  if (profile.outrage_tolerance > 0.4) lines.push('toleriert Empörungsmarketing');
  if (lines.length < 2) lines.push('Interessen-Cluster: ' + topInterests.slice(0, 3).map(([k]) => labelFor(k)).join(', '));
  return lines;
}

function generateMissedList(profile, feedSeen) {
  // Echte Posts, die NICHT gesehen wurden — mit der politisch gegenteiligen
  // Richtung des Spielers und/oder hoher Qualität.
  const seenSet = new Set(feedSeen);
  const lean = profile.political_lean_estimated;
  const unseen = [];
  for (const p of POSTS_LOOKUP?.values() || []) {
    if (seenSet.has(p.id)) continue;
    unseen.push(p);
  }

  function score(p) {
    const pLean = p.political_lean ?? 0;
    let s = 0;
    // Gegen-Perspektive belohnen.
    s += Math.abs(pLean - lean);
    // Wissenschaftliche / qualitative Posts belohnen.
    s += (p.quality_score ?? 0.5) * 0.7;
    // Politik-Mitte belohnen, falls Profil sie kaum kennt.
    if (p.tags?.includes('politik-mitte') && (profile.interests['politik-mitte'] || 0) < 0.2) s += 0.5;
    if (p.tags?.includes('wissenschaft') && (profile.interests['wissenschaft'] || 0) < 0.2) s += 0.5;
    // Empörung leicht abwerten, weil das didaktisch nicht "fehlt".
    s -= 0.6 * (p.outrage_score ?? 0);
    return s;
  }

  const ranked = unseen
    .filter(p => (p.text || '').length > 0)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 4);

  if (!ranked.length) {
    return [{ title: 'Dein Feed hat fast alles abgedeckt.', desc: 'Bemerkenswert breit für ein automatisches System.' }];
  }
  return ranked.map(p => ({
    title: shortenTitle(p.text),
    desc: `von ${authorLabel(p.author)} · ${(p.tags || []).slice(0,2).map(labelFor).join(', ') || 'allgemein'}`
  }));
}

function shortenTitle(text) {
  if (!text) return '—';
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 110 ? t.slice(0, 108) + '…' : t;
}

function authorLabel(authorId) {
  // Schlanker Fallback, ohne Charaktere-Modul zu importieren.
  if (!authorId) return 'jemand';
  return authorId.replace(/^char_/, '').replace(/_/g, ' ');
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Wrapped als standalone HTML-Datei exportieren. Enthält alle Slides
// flach untereinander, mit Print-CSS und der Möglichkeit, das Dokument
// auch im echten Browser zu öffnen, ohne die App.
function downloadWrappedHtml(slides) {
  const character = Store.data.character || {};
  const date = new Date().toLocaleDateString('de-DE');
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<title>Streem-Wrapped · ${escapeHtml(character.name || '')}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; background: #0b0d12; color: #e8ebf3; margin: 0; padding: 2rem 1rem; line-height: 1.5; }
  .wrapped-doc { max-width: 720px; margin: 0 auto; }
  h1 { font-size: 42px; margin: 0 0 .5rem; background: linear-gradient(135deg, #ff2e88, #22d3ee); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .meta { color: #9aa3b8; font-size: 13px; margin-bottom: 3rem; }
  .slide { padding: 2rem; margin: 1.5rem 0; border-radius: 14px; background: linear-gradient(135deg, #1a0a2a, #06070b); border: 1px solid #262b3a; }
  .slide h1, .slide h2 { color: #fff; margin: 0 0 1rem; }
  .slide h1 { font-size: 32px; background: linear-gradient(135deg, #ff2e88, #22d3ee); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .slide h2 { font-size: 24px; }
  .slide p { color: #d8dce6; margin: .5rem 0; }
  .slide .muted, .slide .small { color: #9aa3b8; font-size: 13px; }
  .big-num, .big-word { font-size: clamp(48px, 12vw, 120px); font-weight: 900; line-height: 1; margin: 1rem 0; background: linear-gradient(135deg, #ff2e88, #22d3ee); -webkit-background-clip: text; background-clip: text; color: transparent; text-align: center; }
  .wrapped-bars { display: flex; flex-direction: column; gap: 8px; margin: 1rem 0; }
  .row { display: grid; grid-template-columns: 130px 1fr 50px; gap: 10px; align-items: center; font-size: 14px; }
  .lbl { color: #9aa3b8; text-align: right; }
  .bar { height: 20px; background: #1d2130; border-radius: 10px; overflow: hidden; }
  .fill { height: 100%; background: linear-gradient(90deg, #22d3ee, #ff2e88); }
  .ending-card { background: #151822; border-radius: 14px; padding: 1.5rem; margin: 1.5rem auto; max-width: 480px; border: 2px solid #ff2e88; text-align: center; }
  .ending-emoji { font-size: 64px; margin-bottom: 8px; }
  .ending-title { font-size: 28px; font-weight: 900; margin-bottom: 12px; background: linear-gradient(135deg, #ff2e88, #22d3ee); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .ending-sources { margin-top: 14px; padding-top: 12px; border-top: 1px dashed #262b3a; text-align: left; }
  .ending-sources ul { list-style: none; padding: 0; }
  .ending-sources li { padding: 8px 12px; background: #1d2130; border-left: 3px solid #ff2e88; border-radius: 4px; margin: 6px 0; font-size: 13px; }
  .pathway-line, .npc-quotes, .selfcheck-compare, .whatif-grid, .beat-map, .missed-stories { display: flex; flex-wrap: wrap; gap: 8px; margin: 1rem 0; }
  .pathway-node { background: #1d2130; padding: 6px 10px; border-radius: 16px; font-size: 13px; }
  .pathway-node.radical { background: rgba(250,204,21,0.15); color: #facc15; }
  .pathway-arrow { color: #6b7388; }
  .foot { color: #6b7388; font-size: 12px; margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #262b3a; }
  @media print {
    body { background: #fff; color: #1f2230; }
    .slide { background: #f4f5fa; border: 1px solid #d8dce6; page-break-inside: avoid; }
    .slide h1, .slide h2, .big-num, .big-word, h1 { background: none; -webkit-text-fill-color: #c026d3; color: #c026d3; }
    .ending-card { background: #fff; border-color: #c026d3; }
    .lbl { color: #555; }
    .bar { background: #ddd; }
    .fill { background: #c026d3; }
    .pathway-node { background: #eee; color: #1f2230; }
    .foot { color: #777; border-color: #ccc; }
    @page { margin: 1.5cm; }
  }
</style></head>
<body>
  <div class="wrapped-doc">
    <h1>Streem-Wrapped</h1>
    <div class="meta">${escapeHtml(character.name || 'unbekannt')}${character.protagonist ? ` · ${escapeHtml(character.protagonist)}` : ''} · gespeichert am ${date}</div>
    ${slides.map(s => `<section class="slide">${s.html}</section>`).join('')}
    <div class="foot">
      Gespeichert aus „Der Algorithmus" — ein fiktiver Spielverlauf.<br/>
      Anlaufstellen: bpb.de · klicksafe.de · hateaid.org · Telefonseelsorge 0800 111 0 111.
    </div>
  </div>
</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `streem-wrapped-${(character.name || 'spieler').toLowerCase().replace(/[^a-z0-9]/g, '_')}.html`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 500);
}

/**
 * Rendert alle Slides und steuert die Navigation.
 */
export function renderWrapped(onSandbox, onManifest) {
  const slides = buildWrapped();
  const root = document.getElementById('wrapped-root');
  root.innerHTML = '';

  for (let i = 0; i < slides.length; i++) {
    const s = document.createElement('div');
    s.className = 'wrapped-slide' + (i === 0 ? ' active' : '');
    s.dataset.idx = i;
    s.innerHTML = slides[i].html;
    root.appendChild(s);
  }

  const dots = document.createElement('div');
  dots.className = 'wrapped-dots';
  for (let i = 0; i < slides.length; i++) {
    const d = document.createElement('span');
    if (i === 0) d.className = 'on';
    dots.appendChild(d);
  }
  root.appendChild(dots);

  const nav = document.createElement('div');
  nav.className = 'wrapped-nav';
  nav.innerHTML = `
    <button class="btn btn-ghost" id="wr-back">Zurück</button>
    <button class="btn btn-primary" id="wr-next">Weiter</button>
  `;
  root.appendChild(nav);

  let idx = 0;
  const show = (n) => {
    if (n < 0 || n >= slides.length) return;
    root.querySelectorAll('.wrapped-slide').forEach(el => el.classList.toggle('active', +el.dataset.idx === n));
    root.querySelectorAll('.wrapped-dots span').forEach((d, i) => d.classList.toggle('on', i === n));
    idx = n;
    // letzte Slide: Buttons wiring
    if (n === slides.length - 1) {
      setTimeout(() => {
        const sbx = root.querySelector('#btn-go-sandbox');
        if (sbx) sbx.onclick = () => onSandbox && onSandbox();
        const mf = root.querySelector('#btn-go-manifest');
        if (mf) mf.onclick = () => onManifest && onManifest();
        const sh = root.querySelector('#btn-share-card');
        if (sh) sh.onclick = () => downloadShareCard();
        const wh = root.querySelector('#btn-wrapped-html');
        if (wh) wh.onclick = () => downloadWrappedHtml(slides);
      }, 20);
    }
  };
  nav.querySelector('#wr-back').onclick = () => show(idx - 1);
  nav.querySelector('#wr-next').onclick = () => show(idx + 1);

  // Tastatur
  document.addEventListener('keydown', wrappedKey);
  function wrappedKey(e) {
    const active = document.getElementById('screen-wrapped').classList.contains('active');
    if (!active) { document.removeEventListener('keydown', wrappedKey); return; }
    if (e.key === 'ArrowRight' || e.key === ' ') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
  }
}
