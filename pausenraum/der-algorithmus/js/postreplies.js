// postreplies.js — Generiert NPC-Antworten auf eigene User-Posts.
// Aufgerufen am Wochen-Ende für alle Posts der gerade beendeten Woche,
// damit die Antworten in der darauffolgenden Woche im Notifications-Tab auftauchen.

import { Store } from './state.js';

// Tag → Liste plausibler Reaktionen [author, text, stance]
const REPLY_POOL = {
  'klima': [
    ['char_mira',    'danke fürs Posten. wenn wir leise bleiben, hört uns niemand.', 'support'],
    ['char_bens',    'schon wieder klimathema. langsam wird das zur sekte.',        'pushback'],
    ['char_tariq',   'die zahlen dazu sind nicht so eindeutig, wie es klingt — quelle?', 'curious'],
    ['char_sophia',  'sauber differenziert. teile ich.',                            'support']
  ],
  'politik-links': [
    ['char_mira',    'genau. weiter so.',                                           'support'],
    ['char_bens',    'naive sichtweise. ihr versteht die wirtschaft nicht.',        'pushback'],
    ['char_noah',    'sehe ich anders, aber gut formuliert.',                       'curious']
  ],
  'politik-rechts': [
    ['char_bens',    'endlich sagt mal jemand was.',                                'support'],
    ['char_mira',    'das ist gefährlich. überleg, was du da reproduzierst.',       'pushback'],
    ['char_marla',   'mit dem framing arbeitet auch die afd. bewusst?',             'curious']
  ],
  'politik-mitte': [
    ['char_buerger', 'pragmatisch — danke.',                                        'support'],
    ['char_mira',    'mitte ist auch eine entscheidung.',                           'pushback']
  ],
  'wissenschaft': [
    ['char_tariq',   'guter punkt. methodisch sauber gedacht.',                     'support'],
    ['char_sophia',  'an welcher studie hängst du das fest?',                       'curious'],
    ['char_nele',    'kann ich in der leserunde aufnehmen?',                        'support']
  ],
  'verschwoerung': [
    ['char_bens',    'ja. genau. nicht nachgeben.',                                 'support'],
    ['char_tariq',   'hast du dafür eine primärquelle? ernsthaft, ich frag.',       'curious'],
    ['char_marla',   'das ist ein bekanntes muster. bitte vorsicht.',               'pushback']
  ],
  'feminismus': [
    ['char_fem',     'danke. ich weiß nicht, wie oft das schon gesagt wurde, aber: danke.', 'support'],
    ['char_mira',    'stehe dahinter.',                                              'support'],
    ['char_redpill', 'klassisches victim narrative. langweilig.',                    'pushback']
  ],
  'anti-feminismus': [
    ['char_redpill', 'stark. so sieht das aus.',                                     'support'],
    ['char_fem',     'das brauchen wir nicht. wirklich nicht.',                      'pushback'],
    ['char_lea',     'ehrlich, das ist nicht du. dachte, wir wären weiter.',         'pushback']
  ],
  'hass': [
    ['char_fem',     'das melde ich. tut mir leid, dass du das sagst.',              'pushback'],
    ['char_lea',     'bitte nicht.',                                                 'pushback']
  ],
  'lifestyle': [
    ['char_lea',     'fühl ich. ist greifshafen halt.',                              'support'],
    ['char_jule',    'kommentier auch deine story. so wholesome.',                   'support']
  ],
  'humor': [
    ['char_jule',    'haha. genau das.',                                             'support'],
    ['char_finn',    'mein humor 100%.',                                             'support'],
    ['char_lea',     'der musste sein.',                                             'support']
  ],
  'gaming': [
    ['char_finn',    'pog. spielst du das wirklich noch?',                           'support'],
    ['char_moritz',  'queue heute abend?',                                           'support']
  ],
  'musik': [
    ['char_ana',     'gönn dir. an welcher stelle?',                                 'support'],
    ['char_jule',    'auf meine playlist.',                                          'support']
  ],
  'sport': [
    ['char_moritz',  'training morgen halb sechs. dabei?',                           'support']
  ],
  'true-crime': [
    ['char_tc',      'wir sind dran. mehr nächste woche.',                           'support'],
    ['char_marla',   'kurzer reminder: opferperspektive bleibt wichtig.',            'curious']
  ]
};

const GENERIC = [
  ['char_lea',    'gesehen.',         'support'],
  ['char_moritz', '👀',               'curious'],
  ['char_jule',   'hochgeladen.',     'support']
];

function pickFor(tags) {
  const candidates = [];
  for (const t of tags || []) {
    const arr = REPLY_POOL[t];
    if (arr) for (const r of arr) candidates.push(r);
  }
  if (!candidates.length) return GENERIC.slice();
  return candidates;
}

// Erzeugt 1-2 Reaktionen pro Post; deterministisch über post.ts.
export function generateRepliesFor(ownPost) {
  const pool = pickFor(ownPost.tags);
  if (!pool.length) return [];
  const seed = (ownPost.ts || 0) ^ (ownPost.week || 0) ^ 0x9e3779b9;
  function rand(n) {
    let x = seed;
    return () => { x = (x * 16807) % 2147483647; return x % n; };
  }
  const r = rand(pool.length);
  const a = pool[r()];
  const out = [{ author: a[0], text: a[1], stance: a[2], ts: Date.now() }];
  if (pool.length > 1 && Math.random() > 0.4) {
    let b;
    let tries = 0;
    do { b = pool[r()]; tries++; } while (b[0] === a[0] && tries < 5);
    if (b[0] !== a[0]) out.push({ author: b[0], text: b[1], stance: b[2], ts: Date.now() + 1 });
  }
  return out;
}

// Am Wochen-Ende: für alle Posts der gerade beendeten Woche Antworten erzeugen
// und im Store unter ownPostReplies ablegen.
export function generateRepliesForJustEndedWeek(weekJustEnded) {
  if (!Store.data.ownPostReplies) Store.data.ownPostReplies = {};
  for (const op of Store.data.ownPosts || []) {
    if (op.week !== weekJustEnded) continue;
    const key = `${op.week}_${op.ts || 0}`;
    if (Store.data.ownPostReplies[key]) continue;
    Store.data.ownPostReplies[key] = {
      week: weekJustEnded + 1,
      postSnippet: (op.text || '').slice(0, 120),
      replies: generateRepliesFor(op)
    };
  }
  Store.save();
}

export function getRepliesForInbox() {
  const out = [];
  const all = Store.data.ownPostReplies || {};
  for (const [key, entry] of Object.entries(all)) {
    if (entry.week > Store.data.currentWeek) continue;
    out.push({ key, ...entry });
  }
  out.sort((a, b) => b.week - a.week);
  return out;
}

// Antworten, die zu einem konkreten eigenen Post gehören (über `op.week_ts`).
// Wird beim Render des angepinnten eigenen Posts im Hauptfeed verwendet.
export function getRepliesForOwnPost(op) {
  if (!op) return [];
  const key = `${op.week}_${op.ts || 0}`;
  const entry = Store.data.ownPostReplies?.[key];
  if (!entry) return [];
  if (entry.week > Store.data.currentWeek) return [];
  return entry.replies || [];
}
