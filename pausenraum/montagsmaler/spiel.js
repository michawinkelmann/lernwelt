// spiel.js — Montagsmaler (Pausenraum, Beamermodus). Pictionary auf der digitalen Tafel:
// Eine Person zeichnet den nur ihr gezeigten Begriff, ihr Team rät. Läuft im
// Beamer-Rahmen (assets/js/spiel/beamer.js). Reine Logik (wortpool, sieger) ist
// exportiert und in Node testbar — DOM/Canvas nur in starte().

export const manifest = {
  id: "sp-montagsmaler",
  titel: "Montagsmaler",
  kurz: "Eine Person zeichnet den Begriff, ihr Team rät — Tafel, Stifte und Timer groß im Beamermodus.",
  kategorie: "klasse"
};

const DECK_URL = new URL("../../daten/pausenraum/begriffe-allgemein.json", import.meta.url);

// rein/testbar: Wortpool aus den gewählten Kategorien
export function wortpool(kategorien, gewaehlteIds) {
  const pool = [];
  kategorien.forEach(k => { if (gewaehlteIds.includes(k.id)) k.woerter.forEach(w => pool.push({ wort: w, kat: k.name })); });
  return pool;
}
// rein/testbar: Indizes der Teams mit Höchstpunktzahl
export function sieger(staende) {
  const max = Math.max(...staende);
  return staende.map((p, i) => (p === max ? i : -1)).filter(i => i >= 0);
}

export async function starte(api) {
  const { buehne, el } = api;
  let deck;
  try { deck = await (await fetch(DECK_URL, { cache: "no-store" })).json(); }
  catch (_e) { buehne.innerHTML = `<p class="bm-info">Die Begriffe konnten nicht geladen werden — bitte die Seite neu laden.</p>`; return; }
  const kategorien = deck.kategorien;
  const cfg = { teams: 2, zeit: 90, gewaehlt: kategorien.map(k => k.id) };
  let teams = null, aktiv = 0, ziehe = null, timer = null, aktuell = null, rundeTreffer = 0;

  zeigeSetup();

  function neueRunde() {
    teams = api.baueTeams(Array.from({ length: cfg.teams }, (_, i) => "Team " + (i + 1)));
    ziehe = api.zieher(wortpool(kategorien, cfg.gewaehlt));
    aktiv = 0;
  }
  function kopfTeams() { teams.setzeAktiv(aktiv); return teams.el; }

  function zeigeSetup() {
    if (timer) timer.stopp();
    const chip = (txt, attr, an) => `<button type="button" class="bm-chip ${an ? "bm-an" : ""}" ${attr}>${txt}</button>`;
    buehne.innerHTML = `
      <div class="bm-setup">
        <h2>Montagsmaler — Einstellungen</h2>
        <div class="bm-zeile"><span class="bm-label">Teams</span><div class="bm-wahl" id="mm-teams">
          ${[2, 3, 4].map(n => chip(n + " Teams", `data-teams="${n}"`, cfg.teams === n)).join("")}</div></div>
        <div class="bm-zeile"><span class="bm-label">Zeit pro Runde</span><div class="bm-wahl" id="mm-zeit">
          ${[60, 90, 120].map(s => chip(s + " s", `data-zeit="${s}"`, cfg.zeit === s)).join("")}</div></div>
        <div class="bm-zeile"><span class="bm-label">Kategorien</span><div class="bm-wahl" id="mm-kat">
          ${kategorien.map(k => chip(k.name, `data-kat="${k.id}"`, cfg.gewaehlt.includes(k.id))).join("")}</div></div>
        <p class="bm-info">Pro Runde ist ein Team dran: Eine Person liest den Begriff <strong>heimlich</strong> ein und zeichnet ihn auf der Tafel — <strong>ohne Worte, Buchstaben oder Zahlen</strong>. Ihr Team rät. Pro Treffer 1 Punkt.</p>
        <div class="bm-knopfzeile"><button type="button" class="knopf" id="mm-los">Los geht's</button></div>
      </div>`;
    const single = (sel, key) => buehne.querySelectorAll(sel + " .bm-chip").forEach(b => b.addEventListener("click", () => {
      cfg[key] = Number(b.dataset[key]);
      buehne.querySelectorAll(sel + " .bm-chip").forEach(x => x.classList.toggle("bm-an", x === b));
    }));
    single("#mm-teams", "teams");
    single("#mm-zeit", "zeit");
    buehne.querySelectorAll("#mm-kat .bm-chip").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.kat, i = cfg.gewaehlt.indexOf(id);
      if (i >= 0) { if (cfg.gewaehlt.length > 1) { cfg.gewaehlt.splice(i, 1); b.classList.remove("bm-an"); } }
      else { cfg.gewaehlt.push(id); b.classList.add("bm-an"); }
    }));
    buehne.querySelector("#mm-los").addEventListener("click", () => { neueRunde(); zeigeVorRunde(); });
  }

  function zeigeVorRunde() {
    buehne.innerHTML = "";
    buehne.append(kopfTeams());
    const geheim = api.baueGeheim({ warnung: "Nur die zeichnende Person schaut auf die Tafel!" });
    aktuell = ziehe();
    geheim.setze(`${aktuell.wort}<div class="bm-wort-kat">${aktuell.kat}</div>`);
    const box = el(`<div class="bm-wort">
      <div class="bm-gross">${teams.namen[aktiv]} ist dran</div>
      <p class="bm-info">Eine Person aus ${teams.namen[aktiv]} liest den Begriff heimlich ein („Anzeigen“ → merken → „Verbergen“) und zeichnet ihn dann. Bereit? Dann Runde starten — die Zeit läuft.</p>
      <div class="bm-knopfzeile">
        <button type="button" class="knopf" id="mm-start">Runde starten (${cfg.zeit} s)</button>
        <button type="button" class="knopf zweitrangig" id="mm-ende">Spiel beenden</button>
      </div></div>`);
    box.querySelector(".bm-info").after(geheim.el);
    buehne.append(box);
    box.querySelector("#mm-start").addEventListener("click", zeigeRunde);
    box.querySelector("#mm-ende").addEventListener("click", zeigeEndstand);
  }

  function zeigeRunde() {
    rundeTreffer = 0;
    buehne.innerHTML = "";
    buehne.append(kopfTeams());
    timer = api.baueTimer({ sekunden: cfg.zeit, aufEnde: rundeVorbei });
    buehne.append(timer.el);

    // Geheim-Panel: aktuelles Wort bleibt für die zeichnende Person nachschlagbar
    const geheim = api.baueGeheim({ warnung: "Nur die zeichnende Person schaut auf die Tafel!" });
    const setzeGeheim = () => geheim.setze(`${aktuell.wort}<div class="bm-wort-kat">${aktuell.kat}</div>`);
    setzeGeheim();
    geheim.el.classList.add("mm-geheim-zeile");

    // Zeichenfläche
    const tafel = baueTafel(api);
    buehne.append(tafel.el);
    buehne.append(geheim.el);

    const knoepfe = el(`<div class="bm-knopfzeile">
      <button type="button" class="knopf" id="mm-treffer">Erraten ✓ (+1)</button>
      <button type="button" class="knopf zweitrangig" id="mm-skip">Auslassen</button>
      <button type="button" class="knopf zweitrangig" id="mm-stop">Runde beenden</button></div>`);
    buehne.append(knoepfe);

    const neuesWort = () => { aktuell = ziehe(); setzeGeheim(); geheim.verbergen(); tafel.leeren(); };
    knoepfe.querySelector("#mm-treffer").addEventListener("click", () => { teams.addiere(aktiv, 1); rundeTreffer++; neuesWort(); });
    knoepfe.querySelector("#mm-skip").addEventListener("click", neuesWort);
    knoepfe.querySelector("#mm-stop").addEventListener("click", () => { timer.stopp(); rundeVorbei(); });

    // Größe der Zeichenfläche nach dem Einhängen setzen (responsiv)
    requestAnimationFrame(() => tafel.passeAn());
    timer.start();
  }

  function rundeVorbei() {
    if (timer) timer.stopp();
    const naechster = (aktiv + 1) % cfg.teams;
    buehne.innerHTML = "";
    buehne.append(kopfTeams());
    const box = el(`<div class="bm-wort">
      <div class="bm-gross">${teams.namen[aktiv]}: ${rundeTreffer} ${rundeTreffer === 1 ? "Begriff" : "Begriffe"} in dieser Runde 🎉</div>
      <div class="bm-knopfzeile">
        <button type="button" class="knopf" id="mm-weiter">Weiter: ${teams.namen[naechster]}</button>
        <button type="button" class="knopf zweitrangig" id="mm-ende">Spiel beenden</button>
      </div></div>`);
    buehne.append(box);
    box.querySelector("#mm-weiter").addEventListener("click", () => { aktiv = naechster; zeigeVorRunde(); });
    box.querySelector("#mm-ende").addEventListener("click", zeigeEndstand);
  }

  function zeigeEndstand() {
    if (timer) timer.stopp();
    const st = teams.staende(), gew = sieger(st);
    const titel = gew.length === cfg.teams ? "Unentschieden!"
      : gew.length > 1 ? "Gleichstand: " + gew.map(i => teams.namen[i]).join(" & ")
      : teams.namen[gew[0]] + " gewinnt! 🏆";
    const liste = st.map((p, i) => ({ name: teams.namen[i], p })).sort((a, b) => b.p - a.p)
      .map(r => `<div class="bm-team"><span class="bm-team-name">${r.name}</span><span class="bm-team-punkte">${r.p}</span></div>`).join("");
    buehne.innerHTML = `
      <div class="bm-wort">
        <div class="bm-gross">${titel}</div>
        <div class="bm-teams">${liste}</div>
        <div class="bm-knopfzeile">
          <button type="button" class="knopf" id="mm-nochmal">Nochmal spielen</button>
          <button type="button" class="knopf zweitrangig" id="mm-neu">Einstellungen ändern</button>
        </div></div>`;
    buehne.querySelector("#mm-nochmal").addEventListener("click", () => { neueRunde(); zeigeVorRunde(); });
    buehne.querySelector("#mm-neu").addEventListener("click", zeigeSetup);
  }
}

// Zeichenfläche mit Stiftfarben, Radierer, Strichstärke und Leeren.
// Pointer-Events (Maus + Touch). Gibt { el, leeren, passeAn }.
function baueTafel(api) {
  const { el } = api;
  const PALETTE = [
    { name: "Schwarz", farbe: "#1a1a1a" },
    { name: "Rot", farbe: "#d62828" },
    { name: "Blau", farbe: "#1d4ed8" },
    { name: "Grün", farbe: "#2e7d32" },
    { name: "Gelb", farbe: "#f4b400" },
    { name: "Braun", farbe: "#8b5a2b" }
  ];
  const STAERKEN = [{ name: "dünn", px: 4 }, { name: "mittel", px: 9 }, { name: "dick", px: 18 }];

  const wurzel = el(`<div class="mm-tafel">
    <div class="mm-werkzeuge">
      <div class="mm-farben" role="group" aria-label="Stiftfarbe"></div>
      <div class="mm-staerken" role="group" aria-label="Strichstärke"></div>
      <button type="button" class="knopf zweitrangig mm-radierer">Radierer</button>
      <button type="button" class="knopf zweitrangig mm-leeren">Leeren</button>
    </div>
    <div class="mm-leinwand-box"><canvas class="mm-leinwand" aria-label="Zeichenfläche"></canvas></div>
  </div>`);
  const farbenBox = wurzel.querySelector(".mm-farben");
  const staerkenBox = wurzel.querySelector(".mm-staerken");
  const radierKnopf = wurzel.querySelector(".mm-radierer");
  const leerenKnopf = wurzel.querySelector(".mm-leeren");
  const box = wurzel.querySelector(".mm-leinwand-box");
  const canvas = wurzel.querySelector(".mm-leinwand");
  const ctx = canvas.getContext("2d");

  let stiftFarbe = PALETTE[0].farbe;
  let stiftStaerke = STAERKEN[1].px;
  let radiert = false;
  let zeichnet = false;
  let letzterX = 0, letzterY = 0;

  // Farbknöpfe
  const farbKnoepfe = PALETTE.map(p => {
    const b = el(`<button type="button" class="mm-farbe" title="${p.name}" aria-label="${p.name}" style="--mm-f:${p.farbe}"></button>`);
    farbenBox.append(b);
    b.addEventListener("click", () => { stiftFarbe = p.farbe; radiert = false; markiereFarbe(); markiereRadierer(); });
    return b;
  });
  function markiereFarbe() { farbKnoepfe.forEach((b, i) => b.classList.toggle("mm-aktiv", !radiert && PALETTE[i].farbe === stiftFarbe)); }

  // Strichstärken
  const staerkeKnoepfe = STAERKEN.map(s => {
    const b = el(`<button type="button" class="mm-staerke" title="${s.name}" aria-label="Strichstärke ${s.name}"><span style="width:${s.px}px;height:${s.px}px"></span></button>`);
    staerkenBox.append(b);
    b.addEventListener("click", () => { stiftStaerke = s.px; markiereStaerke(); });
    return b;
  });
  function markiereStaerke() { staerkeKnoepfe.forEach((b, i) => b.classList.toggle("mm-aktiv", STAERKEN[i].px === stiftStaerke)); }

  function markiereRadierer() { radierKnopf.classList.toggle("mm-aktiv", radiert); }
  radierKnopf.addEventListener("click", () => { radiert = !radiert; markiereRadierer(); markiereFarbe(); });
  leerenKnopf.addEventListener("click", () => leeren());

  markiereFarbe(); markiereStaerke(); markiereRadierer();

  // Hintergrund (helle Zeichenfläche, in beiden Modi gut sichtbar)
  const HINTERGRUND = "#fdfdfb";
  function fuelleHintergrund() { ctx.save(); ctx.fillStyle = HINTERGRUND; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore(); }
  function leeren() { fuelleHintergrund(); }

  // Auflösung an die angezeigte Größe anpassen (scharfe Linien auf HiDPI)
  function passeAn() {
    const breite = box.clientWidth || 600;
    const hoehe = Math.max(260, Math.round(breite * 0.52));
    const dpr = window.devicePixelRatio || 1;
    canvas.style.height = hoehe + "px";
    canvas.width = Math.round(breite * dpr);
    canvas.height = Math.round(hoehe * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fuelleHintergrund();
  }

  // Koordinaten relativ zur Zeichenfläche (in CSS-Pixeln, Transform übernimmt dpr)
  function pos(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left), y: (ev.clientY - r.top) };
  }
  function strich(x1, y1, x2, y2) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = radiert ? stiftStaerke * 2.4 : stiftStaerke;
    ctx.strokeStyle = radiert ? HINTERGRUND : stiftFarbe;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  function punkt(x, y) {
    ctx.fillStyle = radiert ? HINTERGRUND : stiftFarbe;
    ctx.beginPath();
    ctx.arc(x, y, (radiert ? stiftStaerke * 2.4 : stiftStaerke) / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function start(ev) {
    ev.preventDefault();
    zeichnet = true;
    const p = pos(ev);
    letzterX = p.x; letzterY = p.y;
    punkt(p.x, p.y);
    canvas.setPointerCapture?.(ev.pointerId);
  }
  function bewege(ev) {
    if (!zeichnet) return;
    ev.preventDefault();
    const p = pos(ev);
    strich(letzterX, letzterY, p.x, p.y);
    letzterX = p.x; letzterY = p.y;
  }
  function ende(ev) {
    if (!zeichnet) return;
    zeichnet = false;
    canvas.releasePointerCapture?.(ev.pointerId);
  }
  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", bewege);
  canvas.addEventListener("pointerup", ende);
  canvas.addEventListener("pointercancel", ende);
  canvas.addEventListener("pointerleave", ende);

  // Beim Fenster-/Vollbildwechsel neu skalieren (Zeichnung beginnt dann frisch)
  const aufResize = () => passeAn();
  window.addEventListener("resize", aufResize);

  return { el: wurzel, leeren, passeAn };
}
