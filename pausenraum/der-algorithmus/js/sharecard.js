// sharecard.js — Erzeugt eine PNG-Karte mit den Wrapped-Highlights
// via Canvas API. Datei wird heruntergeladen; SuS können sie in echten
// Social-Apps posten (was selbst Teil der didaktischen Mechanik ist:
// genau dieser „Share my Wrapped"-Reflex).

import { Store } from './state.js';

const W = 1080, H = 1350; // Instagram-Story-Format

function topInterestLabel() {
  const interests = Store.data.userProfile?.interests || {};
  const top = Object.entries(interests).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 0.05) return 'Lifestyle';
  const map = {
    gaming: 'Gaming', musik: 'Musik', lifestyle: 'Lifestyle', sport: 'Sport',
    wissenschaft: 'Wissenschaft', klima: 'Klima', humor: 'Humor',
    'politik-mitte': 'Politik (Mitte)', 'politik-links': 'Politik (links)',
    'politik-rechts': 'Politik (rechts)', feminismus: 'Feminismus',
    'anti-feminismus': 'Anti-Fem.', verschwoerung: 'Verschwörung',
    hass: 'Hass', 'true-crime': 'True Crime'
  };
  return map[top[0]] || top[0];
}

export function generateShareCard() {
  const d = Store.data;
  if (!d) return null;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Hintergrund-Gradient (Streem-Magenta → Cyan, wie das Logo).
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#2a0b3c');
  grad.addColorStop(0.5, '#1a1029');
  grad.addColorStop(1, '#06070b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Streem-Wortmarke oben.
  ctx.fillStyle = '#ff2e88';
  ctx.font = '900 96px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Streem', W / 2, 180);
  ctx.font = '500 36px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#9aa3b8';
  ctx.fillText('Mein Rückblick', W / 2, 240);

  // Jahres-Wort.
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 48px -apple-system, sans-serif';
  ctx.fillText('Mein Jahres-Wort', W / 2, 360);
  ctx.font = '900 140px -apple-system, sans-serif';
  // Gradient-Text via Linear-Gradient als Fill.
  const wordGrad = ctx.createLinearGradient(0, 400, W, 540);
  wordGrad.addColorStop(0, '#ff2e88');
  wordGrad.addColorStop(1, '#22d3ee');
  ctx.fillStyle = wordGrad;
  ctx.fillText(topInterestLabel(), W / 2, 520);

  // Stats-Reihe.
  const actions = (d.history || []).flatMap(h => h.actions || []);
  const likes = actions.filter(a => a.type === 'like').length;
  const stats = [
    { num: String(likes),                  lbl: 'Likes' },
    { num: String((d.ownPosts || []).length), lbl: 'eigene Posts' },
    { num: String((d.userProfile?.followed || []).length), lbl: 'gefolgt' }
  ];
  const statBoxW = 280, statBoxH = 160, gap = 40;
  const totalW = stats.length * statBoxW + (stats.length - 1) * gap;
  let x0 = (W - totalW) / 2;
  for (const s of stats) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, x0, 660, statBoxW, statBoxH, 24);
    ctx.fill();
    ctx.fillStyle = '#22d3ee';
    ctx.font = '900 72px -apple-system, sans-serif';
    ctx.fillText(s.num, x0 + statBoxW / 2, 745);
    ctx.fillStyle = '#9aa3b8';
    ctx.font = '500 30px -apple-system, sans-serif';
    ctx.fillText(s.lbl, x0 + statBoxW / 2, 790);
    x0 += statBoxW + gap;
  }

  // Ending.
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 48px -apple-system, sans-serif';
  ctx.fillText('Mein Bogen', W / 2, 920);
  ctx.font = '700 56px -apple-system, sans-serif';
  ctx.fillStyle = '#ff2e88';
  const endLabel = endingTitle(d.ending) || 'Mitgetrieben';
  ctx.fillText(endLabel, W / 2, 1000);

  // Disclaimer unten.
  ctx.fillStyle = '#6b7388';
  ctx.font = '400 28px -apple-system, sans-serif';
  ctx.fillText('Lernspiel · Der Algorithmus', W / 2, 1200);
  ctx.font = '400 24px -apple-system, sans-serif';
  ctx.fillText('Alle Zahlen aus einem fiktiven Spielverlauf.', W / 2, 1240);

  return canvas;
}

function endingTitle(key) {
  const m = {
    finn_lost: '🕳️ Finn ist abgerutscht',
    finn_saved: '🪢 Finn gehalten',
    aware: '🪞 Selbstbewusst durch den Feed',
    allyship: '🤝 Verbündete:r',
    rabbithole: '🕳️ Tief im Loch',
    influencer: '📣 Mikro-Influencer:in',
    crusader: '⚔️ Empörte:r Engagierte:r',
    guarded: '🛡️ Achtsame:r Beobachter:in',
    nerd: '📚 Quelle vor Meinung',
    driven: '🌊 Mitgetrieben'
  };
  return m[key];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

export function downloadShareCard() {
  const canvas = generateShareCard();
  if (!canvas) return;
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'streem-wrapped.png';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 500);
  }, 'image/png');
}
