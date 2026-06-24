// selfcheck.js — Pre/Post-Selbsteinschätzung. Vor dem ersten Feed und im
// Wrapped dieselben 5 Fragen, später Vergleich.

import { Store } from './state.js';
import { attachModal } from './modals.js';

const QUESTIONS = [
  {
    id: 'source_check',
    text: 'Wie oft prüfst du Quellen, bevor du etwas online teilst?',
    poles: ['nie', 'immer']
  },
  {
    id: 'feed_influence',
    text: 'Wie stark beeinflusst dein Feed, worüber du nachdenkst?',
    poles: ['gar nicht', 'sehr stark']
  },
  {
    id: 'comfort_disagree',
    text: 'Wie wohl ist dir mit Inhalten, die deiner Meinung widersprechen?',
    poles: ['unwohl', 'sehr wohl']
  },
  {
    id: 'algo_understand',
    text: 'Wie gut verstehst du, wie ein Empfehlungs-Algorithmus funktioniert?',
    poles: ['gar nicht', 'sehr gut']
  },
  {
    id: 'pause_react',
    text: 'Wie oft hältst du inne, bevor du wütend kommentierst?',
    poles: ['selten', 'fast immer']
  }
];

function renderForm(prefilled = {}) {
  return `
    <form class="selfcheck-form">
      ${QUESTIONS.map(q => `
        <fieldset class="selfcheck-q">
          <legend>${escapeHtml(q.text)}</legend>
          <div class="selfcheck-scale">
            <span class="muted small">${escapeHtml(q.poles[0])}</span>
            ${[1, 2, 3, 4, 5].map(v => `
              <label class="selfcheck-radio">
                <input type="radio" name="${q.id}" value="${v}" ${prefilled[q.id] == v ? 'checked' : ''} />
                <span>${v}</span>
              </label>
            `).join('')}
            <span class="muted small">${escapeHtml(q.poles[1])}</span>
          </div>
        </fieldset>
      `).join('')}
    </form>
  `;
}

function readAnswers(formEl) {
  const out = {};
  for (const q of QUESTIONS) {
    const radio = formEl.querySelector(`input[name="${q.id}"]:checked`);
    if (radio) out[q.id] = parseInt(radio.value, 10);
  }
  return out;
}

// Pre-Quiz: erscheint einmal nach dem Onboarding, bevor das Hauptspiel startet.
export function maybeShowPreQuiz(onDone) {
  if (Store.data?.selfcheck?.pre) { onDone(); return; }
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.innerHTML = `
    <div class="tw-box selfcheck-box">
      <h3>Kurz: wo stehst du gerade?</h3>
      <p class="muted small">Fünf Fragen, fünf Skalen. Dauert eine Minute. Wir zeigen dir am Ende des Spiels deinen Vergleich. Die Antworten bleiben auf deinem Gerät.</p>
      ${renderForm()}
      <div class="tw-actions">
        <button class="btn btn-ghost" id="selfcheck-skip">Überspringen</button>
        <button class="btn btn-primary" id="selfcheck-save">Speichern &amp; los</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  const form = overlay.querySelector('.selfcheck-form');
  overlay.querySelector('#selfcheck-skip').onclick = () => {
    if (!Store.data.selfcheck) Store.data.selfcheck = {};
    Store.data.selfcheck.pre = { skipped: true, ts: Date.now() };
    Store.save();
    handle.close();
    onDone();
  };
  overlay.querySelector('#selfcheck-save').onclick = () => {
    const answers = readAnswers(form);
    if (Object.keys(answers).length < QUESTIONS.length) {
      const status = document.createElement('p');
      status.className = 'muted small';
      status.style.color = 'var(--warn)';
      status.textContent = 'Bitte beantworte alle Fragen.';
      form.appendChild(status);
      setTimeout(() => status.remove(), 2400);
      return;
    }
    if (!Store.data.selfcheck) Store.data.selfcheck = {};
    Store.data.selfcheck.pre = { answers, ts: Date.now() };
    Store.save();
    handle.close();
    onDone();
  };
}

// Post-Quiz: wird im Wrapped vor dem Ending angeboten — wenn skipped,
// landet er trotzdem im Vergleichs-Slide als „nicht ausgefüllt".
export function showPostQuiz(onDone) {
  if (Store.data?.selfcheck?.post) { onDone(); return; }
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.innerHTML = `
    <div class="tw-box selfcheck-box">
      <h3>Dieselben fünf Fragen — jetzt nach dem Spiel.</h3>
      <p class="muted small">Vergleich kommt im nächsten Schritt.</p>
      ${renderForm()}
      <div class="tw-actions">
        <button class="btn btn-ghost" id="selfcheck-skip">Überspringen</button>
        <button class="btn btn-primary" id="selfcheck-save">Speichern &amp; weiter</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  const form = overlay.querySelector('.selfcheck-form');
  overlay.querySelector('#selfcheck-skip').onclick = () => {
    if (!Store.data.selfcheck) Store.data.selfcheck = {};
    Store.data.selfcheck.post = { skipped: true, ts: Date.now() };
    Store.save();
    handle.close();
    onDone();
  };
  overlay.querySelector('#selfcheck-save').onclick = () => {
    const answers = readAnswers(form);
    if (Object.keys(answers).length < QUESTIONS.length) {
      const status = document.createElement('p');
      status.className = 'muted small';
      status.style.color = 'var(--warn)';
      status.textContent = 'Bitte beantworte alle Fragen.';
      form.appendChild(status);
      setTimeout(() => status.remove(), 2400);
      return;
    }
    if (!Store.data.selfcheck) Store.data.selfcheck = {};
    Store.data.selfcheck.post = { answers, ts: Date.now() };
    Store.save();
    handle.close();
    onDone();
  };
}

// HTML-Snippet für die Vergleichs-Slide im Wrapped.
export function buildSelfcheckCompareHtml() {
  const sc = Store.data.selfcheck || {};
  const pre = sc.pre?.answers;
  const post = sc.post?.answers;
  if (!pre && !post) {
    return `<p>Du hast die Selbsteinschätzung übersprungen. In einer Klassen-Reflexion lohnt sich der Vergleich — versuch's beim nächsten Mal.</p>`;
  }
  return `
    <div class="selfcheck-compare">
      ${QUESTIONS.map(q => {
        const a = pre?.[q.id];
        const b = post?.[q.id];
        const aFmt = a ? `${a}` : '—';
        const bFmt = b ? `${b}` : '—';
        const delta = (a && b) ? (b - a) : null;
        const arrow = delta === null ? '' : (delta > 0 ? '↑' : delta < 0 ? '↓' : '→');
        return `
          <div class="sc-row">
            <div class="sc-q">${escapeHtml(q.text)}</div>
            <div class="sc-vals">
              <span class="sc-pre">vorher: <strong>${aFmt}</strong></span>
              <span class="sc-arr">${arrow}</span>
              <span class="sc-post">nachher: <strong>${bFmt}</strong></span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
