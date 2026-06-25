// spiel.js — Schüler-Memory (Pausenraum, Beamermodus). Moderations-Brett für das
// bekannte Kreisspiel: Die Plätze (10–34, frei wählbar) sind nummeriert. Die
// Ratenden gehen kurz hinaus, die Klasse verteilt sich danach SELBST auf falsche
// Plätze (das Brett gibt keine Sitzordnung vor). Zwei Teams bringen per
// Platztausch nach und nach alle wieder auf ihren eigenen Platz. Das Brett führt
// die Liste — wahlweise Zahlen 1..n ODER frei gewählte Spitznamen — und den
// Punktestand: Sitzt jemand wieder richtig, wird der Eintrag angetippt, von der
// Liste gestrichen und das ratende Team bekommt einen Punkt. Läuft im Beamer-
// Rahmen (assets/js/spiel/beamer.js). Reine Logik (parseNamen, gueltigeAnzahl,
// baueListe, markiere, nimmZurueck, restOffen, alleErledigt, punkteStand, sieger)
// ist exportiert und in Node testbar — DOM nur in starte().

export const manifest = {
  id: "sp-schueler-memory",
  titel: "Schüler-Memory",
  kurz: "Das Kreisspiel für die Tafel: Plätze 10–34, Zahlen oder Spitznamen. Die Klasse verteilt sich selbst, zwei Teams bringen per Platztausch alle zurück auf ihren Platz.",
  kategorie: "klasse"
};

export const MIN_PLAETZE = 10, MAX_PLAETZE = 34;

// rein/testbar: gültige Platzzahl (ganzzahlig, 10..34)?
export function gueltigeAnzahl(n) {
  return Number.isInteger(n) && n >= MIN_PLAETZE && n <= MAX_PLAETZE;
}

// rein/testbar: Spitznamen aus einem Textfeld — je Zeile ein Name, Leerraum und
// leere Zeilen werden entfernt.
export function parseNamen(text) {
  return String(text).split(/\r?\n/).map(z => z.trim()).filter(z => z.length > 0);
}

// rein/testbar: Liste aus Beschriftungen. Jeder Eintrag bekommt seinen
// Heimatplatz (1-basiert = Reihenfolge) und den Startzustand „unterwegs".
export function baueListe(labels) {
  return labels.map((label, i) => ({ label: String(label), heim: i + 1, erledigt: false, team: null }));
}

// rein/testbar: Eintrag i als heimgekehrt markieren (Punkt fürs Team). Idempotent:
// bereits erledigte Einträge bleiben unverändert. true, wenn neu markiert wurde.
export function markiere(liste, i, team) {
  if (i < 0 || i >= liste.length || liste[i].erledigt) return false;
  liste[i].erledigt = true;
  liste[i].team = team;
  return true;
}

// rein/testbar: Markierung zurücknehmen (Korrektur einer Fehleingabe).
export function nimmZurueck(liste, i) {
  if (i < 0 || i >= liste.length || !liste[i].erledigt) return false;
  liste[i].erledigt = false;
  liste[i].team = null;
  return true;
}

// rein/testbar: wie viele Einträge sind noch unterwegs (nicht erledigt)?
export function restOffen(liste) { return liste.filter(e => !e.erledigt).length; }

// rein/testbar: sitzen alle wieder richtig?
export function alleErledigt(liste) { return liste.length > 0 && liste.every(e => e.erledigt); }

// rein/testbar: Punktestand = Anzahl der von je einem Team heimgebrachten Einträge.
export function punkteStand(liste) {
  return liste.reduce((p, e) => { if (e.team === "a") p.a++; else if (e.team === "b") p.b++; return p; }, { a: 0, b: 0 });
}

// rein/testbar: Sieger anhand des Punktestands. "a" | "b" | null (Gleichstand).
export function sieger(liste) {
  const { a, b } = punkteStand(liste);
  if (a > b) return "a";
  if (b > a) return "b";
  return null;
}

// --- Selbsttests (Node-testbar) ---
export const TESTS = [
  {
    name: "gueltigeAnzahl: 10..34 gültig, sonst nicht",
    ok: () => gueltigeAnzahl(10) && gueltigeAnzahl(34) && gueltigeAnzahl(22)
      && !gueltigeAnzahl(9) && !gueltigeAnzahl(35) && !gueltigeAnzahl(12.5)
  },
  {
    name: "parseNamen trimmt und ignoriert Leerzeilen",
    ok: () => {
      const r = parseNamen(" Anna \n\n  Ben\n  \nCe ");
      return r.length === 3 && r[0] === "Anna" && r[1] === "Ben" && r[2] === "Ce";
    }
  },
  {
    name: "baueListe: Heimatplätze 1..n, alle unterwegs",
    ok: () => {
      const l = baueListe(["x", "y", "z"]);
      return l.length === 3 && l[0].heim === 1 && l[2].heim === 3
        && l.every(e => !e.erledigt && e.team === null);
    }
  },
  {
    name: "markiere + punkteStand + restOffen; doppeltes Markieren wirkungslos",
    ok: () => {
      const l = baueListe(["1", "2", "3", "4"]);
      markiere(l, 0, "a"); markiere(l, 1, "b"); markiere(l, 2, "a");
      const p = punkteStand(l);
      return p.a === 2 && p.b === 1 && restOffen(l) === 1 && markiere(l, 0, "b") === false;
    }
  },
  {
    name: "alleErledigt + sieger (Mehrheit gewinnt)",
    ok: () => {
      const l = baueListe(["1", "2", "3"]);
      markiere(l, 0, "a"); markiere(l, 1, "a"); markiere(l, 2, "b");
      return alleErledigt(l) && sieger(l) === "a";
    }
  },
  {
    name: "nimmZurueck macht Markierung rückgängig",
    ok: () => {
      const l = baueListe(["1", "2"]);
      markiere(l, 0, "a"); nimmZurueck(l, 0);
      return !l[0].erledigt && l[0].team === null && restOffen(l) === 2;
    }
  },
  {
    name: "sieger: Gleichstand null",
    ok: () => {
      const l = baueListe(["1", "2"]);
      markiere(l, 0, "a"); markiere(l, 1, "b");
      return sieger(l) === null && alleErledigt(l);
    }
  }
];

export async function starte(api) {
  const { buehne, el } = api;
  const TEAM = { a: "Team A", b: "Team B" };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  let modus = "zahlen";   // "zahlen" | "namen"
  let anzahl = 20;        // Zahlen-Modus: Platzzahl 10..34
  let namenText = "";     // Namen-Modus: bleibt beim Umschalten erhalten
  let liste = null;
  let aktiv = "a";
  let vorbei = false;
  let verlauf = [];       // Stack markierter Indizes (für Rücknahme)
  let meldung = "";

  zeigeSetup();

  // --- Phase 1: Einstellungen ---
  function zeigeSetup() {
    vorbei = false;
    const chip = (txt, m) => `<button type="button" class="bm-chip ${modus === m ? "bm-an" : ""}" data-modus="${m}">${txt}</button>`;
    buehne.innerHTML = `
      <div class="bm-setup">
        <h2>Schüler-Memory — Einstellungen</h2>
        <div class="bm-zeile"><span class="bm-label">Variante</span><div class="bm-wahl" id="sm-modus">
          ${chip("Zahlen (1–n)", "zahlen")}${chip("Spitznamen", "namen")}</div></div>
        <div id="sm-modusteil"></div>
        <div class="bm-zeile"><span class="bm-label">Teams</span><span class="sm-teams-fest">Team A &nbsp;gegen&nbsp; Team B</span></div>
        <p class="bm-info">Die Plätze im Raum sind durchnummeriert. Die beiden Rate-Teams gehen kurz hinaus, dann <strong>verteilt sich die Klasse selbst</strong> auf falsche Plätze. Die Ratenden rufen abwechselnd zwei Plätze auf, die tauschen — sitzt jemand wieder auf seinem eigenen Platz, wird er hier angetippt: Punkt fürs Team, und es darf nochmal.</p>
        <div class="bm-knopfzeile"><button type="button" class="knopf" id="sm-los">Los geht's</button></div>
        <p class="sm-setupfehler" id="sm-fehler" role="alert"></p>
      </div>`;
    buehne.querySelectorAll("#sm-modus .bm-chip").forEach(b =>
      b.addEventListener("click", () => { modus = b.dataset.modus; zeigeSetup(); }));
    renderModusteil();
    buehne.querySelector("#sm-los").addEventListener("click", starteSpiel);
  }

  function renderModusteil() {
    const ziel = buehne.querySelector("#sm-modusteil");
    if (modus === "zahlen") {
      ziel.innerHTML = `
        <div class="bm-zeile"><span class="bm-label">Anzahl Plätze</span>
          <span class="sm-slider">
            <input type="range" id="sm-n" min="${MIN_PLAETZE}" max="${MAX_PLAETZE}" value="${anzahl}" aria-label="Anzahl Plätze">
            <output id="sm-nout" class="sm-nout">${anzahl}</output>
          </span></div>
        <p class="bm-info" id="sm-zinfo">Plätze 1 bis ${anzahl}.</p>`;
      const r = ziel.querySelector("#sm-n"), o = ziel.querySelector("#sm-nout"), info = ziel.querySelector("#sm-zinfo");
      r.addEventListener("input", () => {
        anzahl = Number(r.value); o.textContent = anzahl; info.textContent = `Plätze 1 bis ${anzahl}.`;
      });
    } else {
      ziel.innerHTML = `
        <div class="bm-zeile bm-zeile-block">
          <span class="bm-label">Spitznamen — eine pro Zeile (${MIN_PLAETZE}–${MAX_PLAETZE})</span>
          <textarea id="sm-namen" class="sm-namen" rows="6" placeholder="Anna&#10;Ben&#10;Cem&#10;…">${esc(namenText)}</textarea>
          <span class="sm-namzahl" id="sm-namzahl"></span>
        </div>
        <p class="bm-info">Die Reihenfolge legt die Heimatplätze fest: 1. Name = Platz 1, 2. Name = Platz 2, …</p>`;
      const ta = ziel.querySelector("#sm-namen"), z = ziel.querySelector("#sm-namzahl");
      const upd = () => {
        namenText = ta.value;
        const n = parseNamen(namenText).length;
        z.textContent = `${n} ${n === 1 ? "Name" : "Namen"}` + (gueltigeAnzahl(n) ? " ✓" : ` (${MIN_PLAETZE}–${MAX_PLAETZE})`);
        z.classList.toggle("sm-ok", gueltigeAnzahl(n));
      };
      ta.addEventListener("input", upd);
      upd();
    }
  }

  function zeigeFehler(t) { const f = buehne.querySelector("#sm-fehler"); if (f) f.textContent = t; }

  // --- Spielstart ---
  function starteSpiel() {
    let labels;
    if (modus === "zahlen") {
      if (!gueltigeAnzahl(anzahl)) return zeigeFehler(`Bitte eine Anzahl zwischen ${MIN_PLAETZE} und ${MAX_PLAETZE} wählen.`);
      labels = Array.from({ length: anzahl }, (_, i) => String(i + 1));
    } else {
      const namen = parseNamen(namenText);
      if (!gueltigeAnzahl(namen.length)) return zeigeFehler(`Bitte ${MIN_PLAETZE} bis ${MAX_PLAETZE} Spitznamen eingeben (aktuell ${namen.length}).`);
      labels = namen;
    }
    liste = baueListe(labels);
    aktiv = "a"; vorbei = false; verlauf = [];
    meldung = "Team A beginnt. Ruft zwei Plätze auf, die tauschen.";
    render();
  }

  // --- Aktionen ---
  function trefferFuer(i) {
    if (vorbei || !markiere(liste, i, aktiv)) return;
    verlauf.push(i);
    meldung = `✓ „${liste[i].label}" sitzt wieder richtig (Platz ${liste[i].heim}) — Punkt für ${TEAM[aktiv]}. Weiter geht's!`;
    if (alleErledigt(liste)) vorbei = true;
    render();
  }
  function wechsel() {
    if (vorbei) return;
    aktiv = aktiv === "a" ? "b" : "a";
    meldung = `${TEAM[aktiv]} ist am Zug. Ruft zwei Plätze auf.`;
    render();
  }
  function undo() {
    if (!verlauf.length) return;
    const i = verlauf.pop();
    nimmZurueck(liste, i);
    meldung = `Rücknahme: „${liste[i].label}" ist wieder unterwegs.`;
    render();
  }
  function neueRunde() {
    liste = baueListe(liste.map(e => e.label));
    aktiv = "a"; vorbei = false; verlauf = [];
    meldung = "Neue Runde. Team A beginnt.";
    render();
  }

  // --- Phase 2: Spiel ---
  function render() {
    buehne.innerHTML = "";
    const n = liste.length, rest = restOffen(liste), p = punkteStand(liste);

    const kopf = el(`<div class="sm-kopf">
      <div class="sm-team sm-a ${aktiv === "a" && !vorbei ? "sm-aktiv" : ""}"><span class="sm-team-name">${TEAM.a}</span><span class="sm-team-punkte">${p.a}</span></div>
      <div class="sm-status" role="status" aria-live="polite"></div>
      <div class="sm-team sm-b ${aktiv === "b" && !vorbei ? "sm-aktiv" : ""}"><span class="sm-team-name">${TEAM.b}</span><span class="sm-team-punkte">${p.b}</span></div>
    </div>`);
    buehne.append(kopf);
    const st = kopf.querySelector(".sm-status");
    if (vorbei) {
      const g = sieger(liste);
      st.innerHTML = g
        ? `<span class="sm-sieg ${g === "a" ? "sm-a-text" : "sm-b-text"}">🏆 ${TEAM[g]} gewinnt!</span><span class="sm-grund">Alle sitzen wieder richtig — ${p.a} : ${p.b}.</span>`
        : `<span class="sm-sieg">🏆 Unentschieden!</span><span class="sm-grund">Alle sitzen wieder richtig — ${p.a} : ${p.b}.</span>`;
    } else {
      st.innerHTML = `<span class="sm-dran">${TEAM[aktiv]} ist am Zug</span><span class="sm-rest">noch unterwegs: <strong>${rest}</strong> von ${n}</span>`;
    }

    if (!vorbei) {
      buehne.append(el(`<p class="sm-instruktion">Die Klasse hat sich neu verteilt. Das Team am Zug nennt zwei Plätze — die beiden tauschen. Sitzt jemand wieder auf <strong>seinem</strong> Platz, tippt hier auf den Eintrag: Punkt fürs Team, und es darf nochmal. Bringt ein Aufruf niemanden heim, ist das andere Team dran.</p>`));
    }

    const wrap = el(`<div class="sm-liste" role="group" aria-label="Plätze, ${n} Stück"></div>`);
    liste.forEach((e, i) => {
      const cls = ["sm-chip", e.erledigt ? "erledigt" : "", e.team ? "team-" + e.team : ""].filter(Boolean).join(" ");
      const aria = e.erledigt
        ? `${esc(e.label)}, Platz ${e.heim}, sitzt richtig — ${TEAM[e.team]}`
        : `${esc(e.label)}, Heimatplatz ${e.heim}, noch unterwegs`;
      const btn = el(`<button type="button" class="${cls}" data-i="${i}" ${e.erledigt || vorbei ? "disabled" : ""} aria-label="${aria}">
        <span class="sm-chip-label">${esc(e.label)}</span>
        <span class="sm-chip-heim">Platz ${e.heim}</span>
        ${e.erledigt ? `<span class="sm-chip-ok">✓ ${TEAM[e.team]}</span>` : ""}
      </button>`);
      wrap.append(btn);
    });
    buehne.append(wrap);
    wrap.querySelectorAll(".sm-chip").forEach(b =>
      b.addEventListener("click", () => trefferFuer(Number(b.dataset.i))));

    buehne.append(el(`<p class="sm-meldung" role="status" aria-live="polite">${meldung || ""}</p>`));

    const steuer = el(`<div class="bm-knopfzeile sm-steuer">
      ${vorbei ? "" : `<button type="button" class="knopf sm-wechsel">Niemand heim → anderes Team</button>`}
      ${verlauf.length && !vorbei ? `<button type="button" class="knopf zweitrangig sm-undo">↶ Letzten zurücknehmen</button>` : ""}
      <button type="button" class="knopf ${vorbei ? "" : "zweitrangig"} sm-neu">Neue Runde</button>
      <button type="button" class="knopf zweitrangig sm-setup">Einstellungen</button>
    </div>`);
    buehne.append(steuer);
    const w = steuer.querySelector(".sm-wechsel"); if (w) w.addEventListener("click", wechsel);
    const u = steuer.querySelector(".sm-undo"); if (u) u.addEventListener("click", undo);
    steuer.querySelector(".sm-neu").addEventListener("click", neueRunde);
    steuer.querySelector(".sm-setup").addEventListener("click", zeigeSetup);
  }
}
