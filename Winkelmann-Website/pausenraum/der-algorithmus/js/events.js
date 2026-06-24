// events.js — Wöchentliche Events: Shitstorms, Gilden, Wahl, Hate-Incident.

import { Store, clamp } from './state.js';
import { toast } from './feed.js';

let EVENTS = [];
let GUILDS = [];
let PARTIES = [];
let SHITSTORM_OUT = {};
let HATE_INCIDENT = {};

export function initEvents(data) {
  EVENTS = data.events;
  GUILDS = data.guilds;
  PARTIES = data.parties;
  SHITSTORM_OUT = data.shitstorm_outcomes;
  HATE_INCIDENT = data.hate_incident;
}

export function getGuildList() { return GUILDS; }
export function getGuildById(id) { return GUILDS.find(g => g.id === id); }
export function getParties() { return PARTIES; }

/**
 * Events für aktuelle Woche auslösen.
 * @returns {Array<{event,result}>} Ergebnisse für Wochen-Karte
 */
export function triggerWeekEvents(weekNum) {
  const results = [];
  const weekEvents = EVENTS.filter(e => e.week === weekNum);
  for (const e of weekEvents) {
    const res = processEvent(e);
    if (res) results.push({ event: e, result: res });
  }
  return results;
}

function processEvent(ev) {
  if (ev.type === 'guild_invite') {
    // Einladung speichern
    if (!Store.data.guildInvites) Store.data.guildInvites = [];
    if (!Store.data.guildInvites.includes(ev.guildId)) {
      Store.data.guildInvites.push(ev.guildId);
      Store.save();
      return { kind: 'invite', guildId: ev.guildId };
    }
  }
  if (ev.type === 'shitstorm_check') {
    const outcome = computeShitstorm();
    if (outcome) {
      Store.data.shitstormHistory.push({
        ...outcome, week: Store.data.currentWeek, kind: outcome.kind
      });
      Store.save();
      return { kind: 'shitstorm', outcome };
    }
  }
  if (ev.type === 'deepfake') {
    return { kind: 'deepfake' };
  }
  if (ev.type === 'hate_incident') {
    return { kind: 'hate_incident' };
  }
  if (ev.type === 'election_start') {
    return { kind: 'election_start' };
  }
  if (ev.type === 'election_vote') {
    // Ergebnis basierend auf User-Profil „perzipiert"
    const perceived = computePerceivedElectionResult();
    Store.data.electionData = perceived;
    Store.save();
    return { kind: 'election_vote', result: perceived };
  }
  return null;
}

function computeShitstorm() {
  // Braucht mindestens einen eigenen Post
  if (!Store.data.ownPosts.length) return null;
  const lastOwn = Store.data.ownPosts[Store.data.ownPosts.length - 1];
  const outrage = lastOwn.outrage || 0;
  const hasPolitical = (lastOwn.tags || []).some(t =>
    ['politik-rechts','politik-links','verschwoerung','hass','feminismus','anti-feminismus'].includes(t));

  let key;
  if (hasPolitical && outrage > 0.2) key = 'negative_political';
  else if (outrage > 0.2) key = 'negative_outrage';
  else if ((lastOwn.tags || []).includes('wissenschaft')) key = 'positive_wissenschaft';
  else key = 'positive_lifestyle';

  const base = SHITSTORM_OUT[key];

  // Personalisierung statt Pool-Zufall: Reichweite hängt sichtbar davon ab,
  // wie aktiv der Account war (eigene Posts, vergebene Reaktionen) und wie
  // empörungsgeladen der Auslöser-Post ist. Didaktik: Viralität ist keine
  // Lotterie — der eigene Stil hat den Verlauf mitbestimmt.
  const ownCount = Store.data.ownPosts.length;
  const interactions = (Store.data.history || [])
    .flatMap(h => h.actions || [])
    .filter(a => ['like','comment','angry_comment','share'].includes(a.type)).length;
  const activity = Math.min(1.5, 0.6 + ownCount * 0.12 + interactions * 0.01);
  const outrageBoost = 1 + outrage * 1.2;
  const followerDelta = Math.round((base.followerDelta || 100) * activity * outrageBoost / 10) * 10;

  const snippet = (lastOwn.text || '').slice(0, 60) + ((lastOwn.text || '').length > 60 ? '…' : '');
  const explain = `Auslöser war dein Post „${snippet}". Deine Aktivität (${ownCount} eigene Posts, ${interactions} Reaktionen)` +
    (outrage > 0.2 ? ' und der Empörungs-Anteil darin haben' : ' hat') +
    ` die Welle verstärkt: ${followerDelta >= 0 ? '+' : ''}${followerDelta} Follower.`;

  return { ...base, kind: key, followerDelta, body: `${base.body} ${explain}` };
}

/**
 * Wahlergebnis aus Sicht des User-Feeds (perzipiert)
 * + objektives Ergebnis
 */
function computePerceivedElectionResult() {
  const objective = [
    { id: 'p_buerger', name: 'Bürgerliste',        share: 0.29 },
    { id: 'p_zukunft', name: 'Zukunft Greifshafen', share: 0.26 },
    { id: 'p_alt',     name: 'Neue Alternative',    share: 0.23 },
    { id: 'p_heimat',  name: 'Heimat Zuerst',       share: 0.12 },
    { id: 'sonst',     name: 'Sonstige',            share: 0.10 }
  ];
  // Perzipierte Verteilung: verzerrt durch political_lean_estimated
  const lean = Store.data.userProfile.political_lean_estimated;
  const perceived = objective.map(p => {
    const party = PARTIES.find(x => x.id === p.id);
    const partyLean = party ? party.lean : 0;
    const agreement = 1 - Math.abs(partyLean - lean) / 2;  // 0..1
    const boost = 1 + (agreement - 0.5) * 0.8 * Math.abs(lean);
    return { ...p, perceived: p.share * boost };
  });
  // Normalisieren
  const sum = perceived.reduce((a, b) => a + b.perceived, 0);
  perceived.forEach(p => p.perceived = p.perceived / sum);
  return { objective, perceived };
}

/**
 * Hate-Incident-Chat-Daten.
 */
export function getHateIncidentData() { return HATE_INCIDENT; }

/**
 * Reaktion auf eine Gilden-Nachricht verbuchen.
 */
export function applyGuildReaction(guildId, choiceId, choice) {
  const effect = choice.effect || {};
  const p = Store.data.userProfile;
  if (effect.tags) {
    for (const [t, v] of Object.entries(effect.tags)) {
      p.interests[t] = clamp((p.interests[t] || 0) + v, 0, 1);
    }
  }
  if (effect.leaveGuild) {
    Store.data.guildMemberships = Store.data.guildMemberships.filter(x => x !== guildId);
  } else {
    if (!Store.data.guildMemberships.includes(guildId)) {
      Store.data.guildMemberships.push(guildId);
    }
  }
  if (!Store.data.guildReactions[guildId]) Store.data.guildReactions[guildId] = [];
  Store.data.guildReactions[guildId].push({ choiceId, week: Store.data.currentWeek });
  Store.save();
}

/**
 * Badge-Vergabe-Logik am Ende jeder Woche.
 */
export function checkBadges() {
  const awarded = [];
  const actions = Store.data.history.flatMap(h => h.actions || []);
  const likes = actions.filter(a => a.type === 'like').length;
  const comments = actions.filter(a => a.type === 'comment' || a.type === 'angry_comment').length;
  const follows = actions.filter(a => a.type === 'follow').length;
  const angry = actions.filter(a => a.type === 'angry_comment').length;
  const mutes = actions.filter(a => a.type === 'mute').length;
  const shares = actions.filter(a => a.type === 'share').length;
  const tws = Store.data.contentWarningsAccepted || {};
  const twSkip = Object.values(tws).reduce((a, b) => a + (b.skipped || 0), 0);
  const twShown = Object.values(tws).reduce((a, b) => a + (b.shown || 0), 0);
  const ownPostCount = (Store.data.ownPosts || []).length;
  const ownPostStickers = (Store.data.ownPosts || []).filter(p => p.sticker).length;
  const bookmarks = Object.keys(Store.data.bookmarks || {}).length;
  const dmReplies = Object.keys(Store.data.dmReplies || {}).length;
  const placeVisits = Object.values(Store.data.placesVisited || {}).reduce((a, b) => a + b, 0);
  const arcs = Store.data.npcArcs || {};

  const reports = Object.keys(Store.data.reports || {}).length;

  if (likes >= 20 && Store.addBadge('Early Adopter', '20 Likes in der ersten Phase')) awarded.push('Early Adopter');
  if (reports >= 2 && Store.addBadge('Melder:in', 'Du hast Grenzüberschreitungen gemeldet statt weiterzuscrollen')) awarded.push('Melder:in');
  if (angry >= 5 && Store.addBadge('Flammenwerfer', 'Du hast wütend kommentiert')) awarded.push('Flammenwerfer');
  if (comments === 0 && Store.data.currentWeek >= 5 && Store.addBadge('Stiller Beobachter', 'Lesen statt Schreiben')) awarded.push('Stiller Beobachter');
  if (follows >= 10 && Store.addBadge('Netzwerker', 'Du folgst 10+ Accounts')) awarded.push('Netzwerker');
  if ((Store.data.guildMemberships.includes('echte_werte') || Store.data.guildMemberships.includes('spurensuche_gh')) && Store.addBadge('Tief im Loch', 'Rabbit-Hole betreten')) awarded.push('Tief im Loch');
  if (Store.data.guildMemberships.includes('lese_runde') && Store.addBadge('Bücherwurm', 'Der Leserunde beigetreten')) awarded.push('Bücherwurm');

  // Neue Achievements — nuanciert nach Spielstil.
  if (mutes >= 5 && Store.addBadge('Türsteher:in', '5+ Accounts stummgeschaltet — bewusst kuratiert')) awarded.push('Türsteher:in');
  if (shares >= 10 && Store.addBadge('Reichweiten-Bauer:in', '10+ Beiträge geteilt')) awarded.push('Reichweiten-Bauer:in');
  if (twSkip >= 4 && Store.addBadge('Selbstschutz', 'Mehrfach Inhalte bewusst übersprungen')) awarded.push('Selbstschutz');
  if (twShown >= 3 && Store.addBadge('Hinschauen', 'Mehrfach durch die Warnung gegangen — bewusst informiert')) awarded.push('Hinschauen');
  if (ownPostCount >= 5 && Store.addBadge('Stimme', '5+ eigene Posts geschrieben')) awarded.push('Stimme');
  if (ownPostStickers >= 3 && Store.addBadge('Sticker-Bro', 'Drei eigene Posts mit Sticker')) awarded.push('Sticker-Bro');
  if (bookmarks >= 3 && Store.addBadge('Sammler:in', '3+ Posts für die Reflexion gemerkt')) awarded.push('Sammler:in');
  if (dmReplies >= 4 && Store.addBadge('Antworter:in', 'Vier DMs persönlich beantwortet')) awarded.push('Antworter:in');
  if (placeVisits >= 6 && Store.addBadge('Spurensucher:in', 'Greifshafen durchgeklickt')) awarded.push('Spurensucher:in');
  if ((arcs.lea_close || 0) >= 0.5 && Store.addBadge('Beste Freundin', 'Lea sieht dich an guten Tagen.')) awarded.push('Beste Freundin');
  if ((arcs.finn_path || 0) <= -2 && Store.addBadge('Wachposten', 'Finn vor der Gilde gewarnt.')) awarded.push('Wachposten');
  if ((arcs.mira_close || 0) >= 0.4 && Store.addBadge('Verbündete:r', 'Mira hat dir vertraut.')) awarded.push('Verbündete:r');

  return awarded;
}
