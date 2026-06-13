// minigame.js — Bot-or-Human-Quiz. Wird in W12 als optionales Event freigeschaltet.

import { Store } from './state.js';
import { getCharacter, avatarSvg } from './characters.js';
import { SFX } from './sound.js';

const ROUNDS = [
  {
    profiles: [
      { handle: '@truth_warrior_88', name: 'truth_warrior_88', avatar: 10, bio: 'wacht nicht schläft',
        post: 'WAS DIE MEDIEN VERSCHWEIGEN — Heute 18 Uhr Live! Teilen für die Wahrheit! 🔥🔥🔥',
        joined: 'vor 3 Wochen', posts_per_day: '47', followers: '212',
        bot: true, tell: 'Account-Alter sehr jung, hohe Posting-Frequenz, Generisches "Truth"-Naming-Schema mit Zahl.' },
      { handle: '@nele.lit', name: 'Nele', avatar: 6, bio: 'Buch-Rezensionen',
        post: 'Hab heute „Die Quelle" beendet. Erste Hälfte stark, zweite konstruiert. 6/10.',
        joined: 'vor 4 Jahren', posts_per_day: '0,4', followers: '380',
        bot: false, tell: 'Persönliches Urteil, normale Posting-Frequenz, alter Account.' }
    ]
  },
  {
    profiles: [
      { handle: '@klara_k', name: 'KlaraKomm', avatar: 11, bio: 'folge für Free Stuff',
        post: '💎💎 GEWINNSPIEL! Folgen + Liken + 5 Freunde taggen = iPhone! Verlosung Sonntag! Link in Bio 💎💎',
        joined: 'vor 11 Tagen', posts_per_day: '12', followers: '8,3k',
        bot: true, tell: 'Klassischer Engagement-Bait-Schema, sehr junger Account mit hoher Follower-Zahl (gekauft).' },
      { handle: '@tariq_dot', name: 'Tariq', avatar: 5, bio: 'Physik-Nerd, Uni HH',
        post: 'Heute in der Vorlesung: Maxwell-Gleichungen, vierte Form. Mein Lieblingsmoment in Physik bisher.',
        joined: 'vor 2 Jahren', posts_per_day: '0,8', followers: '156',
        bot: false, tell: 'Inhalt fachlich-spezifisch, niedrige Frequenz, realistische Follower-Zahl.' }
    ]
  },
  {
    profiles: [
      { handle: '@lara.feminismus', name: 'Lara Weiss', avatar: 24, bio: 'Aktivistin · Autorin',
        post: 'Bin gerade aus einer Lesung in Bremen zurück. Drei Stunden Diskussion, viele neue Fragen mitgenommen.',
        joined: 'vor 6 Jahren', posts_per_day: '1,2', followers: '24k',
        bot: false, tell: 'Persönlicher Tonfall, etablierter Account, plausibles Posting-Verhalten.' },
      { handle: '@bens_real', name: 'Benedikt Schmitt', avatar: 7, bio: '"sagt, was ist" · 38k Follower',
        post: 'Die LÜGEN der Eliten zerlegen — heute Abend 20 Uhr. Wer NICHT zuhört, ist Teil des Problems.',
        joined: 'vor 1,5 Jahren', posts_per_day: '8',  followers: '38k',
        bot: false, tell: 'Mensch, aber Profi-Empörer. Diese Tonalität ist Strategie, kein Bot — und genau das macht ihn schwer einzuordnen.' }
    ]
  }
];

export function runMinigame(root, onClose) {
  let idx = 0;
  let score = 0;
  const guesses = [];

  function renderRound() {
    if (idx >= ROUNDS.length) {
      finish();
      return;
    }
    const round = ROUNDS[idx];
    root.innerHTML = `
      <div class="minigame-header">
        <h2>Bot oder Mensch?</h2>
        <div class="minigame-progress">Runde ${idx + 1} / ${ROUNDS.length} · Punkte: ${score}</div>
      </div>
      <p class="muted">Markiere für jedes Profil: Bot oder Mensch. Es können auch zwei Menschen oder zwei Bots sein.</p>
      <div class="minigame-profiles">
        ${round.profiles.map((p, i) => `
          <div class="minigame-profile" data-i="${i}">
            <div class="mp-head">
              <div class="avatar">${avatarSvg(p.avatar)}</div>
              <div>
                <div class="mp-name">${escapeHtml(p.name)}</div>
                <div class="mp-handle muted small">${escapeHtml(p.handle)}</div>
              </div>
            </div>
            <div class="mp-bio muted small">${escapeHtml(p.bio)}</div>
            <div class="mp-post">${escapeHtml(p.post)}</div>
            <div class="mp-stats">
              <span>📅 ${escapeHtml(p.joined)}</span>
              <span>✍️ ${escapeHtml(p.posts_per_day)}/Tag</span>
              <span>👥 ${escapeHtml(p.followers)}</span>
            </div>
            <div class="mp-vote">
              <button type="button" class="mp-btn" data-guess="bot">Bot</button>
              <button type="button" class="mp-btn" data-guess="human">Mensch</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="minigame-actions">
        <button class="btn btn-primary" id="mg-submit" disabled>Auflösen</button>
      </div>
      <div id="mg-feedback" class="mg-feedback" hidden></div>
    `;

    const chosen = {};
    root.querySelectorAll('.minigame-profile').forEach(card => {
      const i = parseInt(card.dataset.i, 10);
      card.querySelectorAll('.mp-btn').forEach(b => {
        b.onclick = () => {
          chosen[i] = b.dataset.guess;
          card.querySelectorAll('.mp-btn').forEach(x => x.classList.remove('selected'));
          b.classList.add('selected');
          updateSubmit();
        };
      });
    });
    const submit = root.querySelector('#mg-submit');
    function updateSubmit() {
      submit.disabled = Object.keys(chosen).length < round.profiles.length;
    }
    submit.onclick = () => {
      const fb = root.querySelector('#mg-feedback');
      fb.hidden = false;
      let html = '<h3>Auflösung</h3>';
      let roundScore = 0;
      round.profiles.forEach((p, i) => {
        const guess = chosen[i];
        const correct = (guess === 'bot') === !!p.bot;
        if (correct) roundScore++;
        html += `<div class="mg-resolve ${correct ? 'ok' : 'bad'}">
          <strong>${escapeHtml(p.handle)}: ${p.bot ? 'Bot' : 'Mensch'}</strong> — ${correct ? 'richtig' : 'falsch'}.
          <br/><span class="muted small">${escapeHtml(p.tell)}</span>
        </div>`;
      });
      score += roundScore;
      guesses.push({ round: idx, score: roundScore, max: round.profiles.length });
      fb.innerHTML = html + `<button class="btn btn-primary" id="mg-next">${idx < ROUNDS.length - 1 ? 'Nächste Runde' : 'Ergebnis'}</button>`;
      fb.querySelector('#mg-next').onclick = () => { idx++; renderRound(); };
      SFX.swipe();
    };
  }

  function finish() {
    const total = ROUNDS.reduce((a, r) => a + r.profiles.length, 0);
    const verdict = score >= total - 1 ? 'Sehr gut.' : score >= total / 2 ? 'Solide — die Mischformen sind echt schwer.' : 'Schwierig, oder? Genau deshalb funktionieren Bots so gut.';
    if (!Store.data.minigameResults) Store.data.minigameResults = {};
    Store.data.minigameResults.bot_or_human = { score, total, ts: Date.now() };
    Store.save();
    SFX.badge();
    root.innerHTML = `
      <div class="minigame-finish">
        <h2>${score} / ${total}</h2>
        <p>${escapeHtml(verdict)}</p>
        <p class="muted small">Echte Plattformen schaffen es selten, Bots zuverlässig zu markieren — auch nicht mit dem Score-Profil aus dem Backend, das du gerade gesehen hast.</p>
        <button class="btn btn-primary" id="mg-close">Zurück</button>
      </div>
    `;
    root.querySelector('#mg-close').onclick = onClose;
  }

  renderRound();
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
