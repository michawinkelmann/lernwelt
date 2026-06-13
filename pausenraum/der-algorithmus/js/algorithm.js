// algorithm.js — Die Empfehlungs-Engine.
// Didaktisches Herz: nachvollziehbar, manipulierbar, ausstellbar.

import { clamp } from './state.js';

/**
 * Affinity: Übereinstimmung Post-Tags vs. User-Interessen.
 * Mischung aus Summe (mehr Treffer = besser) und Max (ein Top-Tag schlägt durch).
 * @returns {number} 0..1
 */
function affinity(post, profile) {
  const tags = post.tags || [];
  if (!tags.length) return 0.1;
  let sum = 0, max = 0;
  for (const t of tags) {
    const v = profile.interests[t] || 0;
    sum += v;
    if (v > max) max = v;
  }
  return clamp(0.5 * max + 0.5 * Math.min(1, sum), 0, 1);
}

/**
 * Engagement-Boost: empörungslastige / engagement-bait Posts werden belohnt.
 * Das ist genau der Effekt, den wir zeigen wollen.
 */
function engagementBoost(post) {
  const bait = post.engagement_bait_score || 0;
  const outrage = post.outrage_score || 0;
  return clamp(0.5 * bait + 0.7 * outrage, 0, 1.5);
}

/**
 * Recency: jüngere Posts höher gewichten.
 * weekOffset = wie viele Wochen alt (0 = aktuell). Fehlt der Wert,
 * wird der Post als "frisch" behandelt (≈ 1).
 */
function recency(post) {
  const age = Math.max(0, post.weekOffset || 0);
  return Math.exp(-age * 0.45);
}

/**
 * Social-Boost: Post stammt von einem gefolgten Account.
 */
function followedAuthorBoost(post, profile) {
  return profile.followed.includes(post.author) ? 1 : 0;
}

/**
 * Paid-Boost: bezahlte Anzeigen, die nach Ziel-Profil gematcht sind.
 */
function paidBoost(post, profile) {
  if (!post.isAd) return 0;
  if (!post.targetTags || !post.targetTags.length) return 0.3;
  let match = 0;
  for (const t of post.targetTags) match += profile.interests[t] || 0;
  return clamp(0.3 + (match / post.targetTags.length) * 1.2, 0, 2);
}

/**
 * Diversity-Strafe: hat der Nutzer diese Art Content in dieser Woche bereits mehrfach gesehen?
 * Niedrige Diversity = Filterblase.
 */
function diversityPenalty(post, recentTags) {
  const tags = post.tags || [];
  let overlap = 0;
  for (const t of tags) if (recentTags[t]) overlap += recentTags[t];
  return clamp(overlap * 0.3, 0, 3);
}

/**
 * Qualitäts-Bonus (in Sandbox aktivierbar).
 * Spreizt den im Datensatz oft flachen quality_score, damit der Slider
 * "Qualitäts-Bonus" sichtbar differenziert. Empörung + Engagement-Bait
 * drücken die wahrgenommene Qualität, ein Artikel-Anhang hebt sie.
 */
function qualityBonus(post) {
  let q = post.quality_score;
  if (q === undefined || q === null) q = 0.5;
  q -= 0.45 * (post.outrage_score || 0);
  q -= 0.2 * (post.engagement_bait_score || 0);
  if (post.article) q += 0.15;
  return clamp(q, 0, 1);
}

/**
 * Balance: belohnt Posts, deren political_lean entgegengesetzt zur geschätzten Neigung des Nutzers ist.
 */
function balanceBonus(post, profile) {
  if (post.political_lean === undefined || post.political_lean === null) return 0;
  const diff = Math.abs(post.political_lean - profile.political_lean_estimated);
  return clamp(diff * 0.5, 0, 1);
}

/**
 * Zentrale Score-Funktion.
 * @returns {{total: number, parts: Object}}
 */
export function scorePost(post, profile, weights, recentTags = {}) {
  const parts = {
    affinity: affinity(post, profile) * weights.affinity,
    engagement: engagementBoost(post) * weights.engagement,
    recency: recency(post) * weights.recency,
    social: followedAuthorBoost(post, profile) * weights.social,
    ads: paidBoost(post, profile) * weights.ads,
    diversity: -diversityPenalty(post, recentTags) * weights.diversity,
    quality: qualityBonus(post) * weights.quality,
    outrage: -(post.outrage_score || 0) * (weights.outragePenalty || 0),
    balance: balanceBonus(post, profile) * (weights.balance || 0)
  };
  let total = 0;
  for (const k of Object.keys(parts)) total += parts[k];
  return { total, parts };
}

/**
 * Feed für eine Woche zusammenstellen.
 * @param {Array} posts - Pool aller Posts
 * @param {Array} ads - Pool aller Ads
 * @param {Object} profile - User-Profil
 * @param {Object} weights - Gewichte
 * @param {Object} opts - { limit, unlocked, seed, muted }
 */
export function buildFeed(posts, ads, profile, weights, opts = {}) {
  const {
    limit = 10,
    unlocked = [],
    weekOffset = 0,
    muted = []
  } = opts;

  // Ads nur, wenn freigeschaltet
  const adsEnabled = unlocked.includes('ads');
  const pool = [...posts];
  if (adsEnabled) {
    for (const a of ads) pool.push({ ...a, isAd: true });
  }

  // Muted-Autoren rausfiltern
  const filtered = pool.filter(p => !muted.includes(p.author));

  const recentTags = {};
  const chosen = [];
  const indices = filtered.map((_, i) => i);

  // Iterativ den Top-Post ziehen, Tags notieren, Diversity-Penalty wächst.
  for (let i = 0; i < Math.min(limit, filtered.length); i++) {
    let bestIdx = -1;
    let bestScore = -Infinity;
    let bestBreakdown = null;

    for (const idx of indices) {
      if (chosen.includes(idx)) continue;
      const p = filtered[idx];
      const pWithOffset = { ...p, weekOffset };
      const { total, parts } = scorePost(pWithOffset, profile, weights, recentTags);
      if (total > bestScore) {
        bestScore = total;
        bestIdx = idx;
        bestBreakdown = parts;
      }
    }
    if (bestIdx < 0) break;
    chosen.push(bestIdx);
    const post = filtered[bestIdx];
    for (const t of post.tags || []) {
      recentTags[t] = (recentTags[t] || 0) + 1;
    }
    post._algoBreakdown = bestBreakdown;
    post._algoScore = bestScore;
  }

  return chosen.map(i => filtered[i]);
}

/**
 * Ein einzelner "Warum sehe ich das?"-Text auf Basis des letzten Breakdowns.
 */
export function explainPost(post) {
  if (!post._algoBreakdown) {
    return { summary: 'Keine Daten vorhanden.', reasons: [] };
  }
  const b = post._algoBreakdown;
  const reasons = Object.entries(b)
    .map(([k, v]) => ({ k, v }))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .filter(r => Math.abs(r.v) > 0.02)
    .slice(0, 4);

  const labels = {
    affinity: 'Passt zu deinen bisherigen Interessen',
    engagement: 'Hoher Engagement-Wert (viele Likes/Empörung)',
    recency: 'Ist neu',
    social: 'Kommt von einem Account, dem du folgst',
    ads: 'Ist bezahlte Werbung — auf dein Profil zugeschnitten',
    diversity: 'Wurde trotz ähnlicher Inhalte gezeigt',
    quality: 'Journalistische Qualität',
    outrage: 'Empörungs-Strafe',
    balance: 'Gegen-Perspektive (Ausgleich)'
  };
  return {
    summary: post.isAd ? 'Dieser Beitrag ist eine bezahlte Anzeige.' :
      'Das System hat diesen Post oben sortiert, weil folgende Faktoren am stärksten waren:',
    reasons: reasons.map(r => ({
      label: labels[r.k] || r.k,
      value: r.v,
      key: r.k
    }))
  };
}
