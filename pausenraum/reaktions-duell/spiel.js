// spiel.js — Reaktions-Duell (Pausenraum, 2 Spieler an einem Gerät)
// Zwei-Spieler-Ampel: Beide warten auf Grün, wer zuerst drückt, gewinnt die
// Runde (Anzeige beider Zeiten in ms). Frühstart = Runde an den Gegner.
// Best-of-5: Wer zuerst 3 Runden hat, gewinnt das Match → Endpanel mit Revanche.
// Steuerung: Taste A (links) / Taste L (rechts) oder linke/rechte Bildschirmhälfte.
// Kein Highscore, kein Audio; reduzierteBewegung: identisch (keine Animationen).
//
// Die reine Logik (rundenSieger, matchVorbei) ist exportiert und in Node
// testbar: Auf Modulebene wird kein document/window angefasst.

// ---------- Reine Logik ----------

// Wer gewinnt die Runde? Rückgabe: "links" | "rechts" | "keiner".
// - Frühstart einer Seite → Punkt für die andere Seite.
// - Beide Frühstart oder niemand gedrückt oder exakt gleiche Zeit → "keiner"
//   (die Runde wird wiederholt).
// - Sonst (Gleichstand der Fälle: beide gültig gedrückt) → die schnellere Zeit gewinnt;
//   wer gar nicht gedrückt hat (null), verliert gegen jede gemessene Zeit.
export function rundenSieger(tLinks, tRechts, fruehL, fruehR) {
  if (fruehL && fruehR) return "keiner";
  if (fruehL) return "rechts";
  if (fruehR) return "links";
  const links = tLinks == null ? Infinity : tLinks;
  const rechts = tRechts == null ? Infinity : tRechts;
  if (links === rechts) return "keiner";
  return links < rechts ? "links" : "rechts";
}

// Best-of-5: Wer zuerst 3 Runden gewonnen hat, gewinnt das Match.
// Rückgabe: "links" | "rechts" | null (Match läuft noch).
export function matchVorbei(standL, standR) {
  if (standL >= 3) return "links";
  if (standR >= 3) return "rechts";
  return null;
}

// ---------- Manifest ----------

export const manifest = {
  id: "sp-reaktions-duell",
  titel: "Reaktions-Duell",
  kurz: "Zwei Spieler, eine Ampel: Wer nach Grün zuerst drückt, holt die Runde — Best of 5.",
  punkteLabel: "Runden",
  highscore: false,
  zeigeZeit: false,
  steuerungHinweis: "Spieler links: Taste A — Spieler rechts: Taste L. Touch: linke/rechte Bildschirmhälfte."
};

const SIEG_RUNDEN = 3;
const PAUSE_MIN_MS = 1500;    // Zufallspause vor Grün: 1,5–4 s
const PAUSE_SPANNE_MS = 2500;
const ANSAGE_MS = 1100;       // „Runde n“-Ansage
const NACHDRUECK_MS = 900;    // Fenster, damit auch die zweite Zeit erfasst wird
const NIEMAND_MS = 4000;      // niemand drückt nach Grün → Runde wiederholen
const ERGEBNIS_MS = 1900;     // Anzeige des Rundenergebnisses

// ---------- Spiel ----------

export function starte(api) {
  // Phasen: start | ansage | warten | gruen | ergebnis | vorbei
  let phase = "start";
  let stand = { links: 0, rechts: 0 };
  let runde = 0;
  let tGruen = null;
  let zeit = { links: null, rechts: null }; // Reaktionszeiten der Runde in ms
  let timerListe = [];

  const flaeche = api.flaeche;

  function spaeter(fn, ms) { timerListe.push(setTimeout(fn, ms)); }
  function stoppeTimer() { timerListe.forEach(clearTimeout); timerListe = []; }

  function baueBuehne() {
    flaeche.innerHTML = `<div class="rd-buehne" id="rd-buehne" data-phase="start">
      <section class="rd-haelfte" id="rd-links" aria-label="Spieler links">
        <p class="rd-name">Links</p>
        <p class="rd-taste">Taste A · linke Hälfte</p>
        <p class="rd-stand" id="rd-stand-links">0</p>
        <p class="rd-zeit" id="rd-zeit-links"></p>
      </section>
      <section class="rd-haelfte" id="rd-rechts" aria-label="Spieler rechts">
        <p class="rd-name">Rechts</p>
        <p class="rd-taste">Taste L · rechte Hälfte</p>
        <p class="rd-stand" id="rd-stand-rechts">0</p>
        <p class="rd-zeit" id="rd-zeit-rechts"></p>
      </section>
      <div class="rd-mitte" id="rd-mitte" role="status" aria-live="polite"></div>
    </div>`;
  }

  function setzePhase(p) {
    const el = flaeche.querySelector("#rd-buehne");
    if (el) el.dataset.phase = p;
  }

  // Die Mitte ist nie nur Farbe: Symbol + großer Text + Hinweiszeile (+ Startknopf).
  function zeigeMitte(symbol, gross, klein, mitKnopf = false) {
    const mitte = flaeche.querySelector("#rd-mitte");
    mitte.innerHTML = `<p class="rd-symbol" aria-hidden="true">${symbol}</p>
      <p class="rd-gross">${gross}</p>
      ${klein ? `<p class="rd-klein">${klein}</p>` : ""}
      ${mitKnopf ? '<button type="button" class="knopf rd-start" id="rd-los">Los geht’s!</button>' : ""}`;
    if (mitKnopf) {
      mitte.querySelector("#rd-los").addEventListener("click", () => {
        flaeche.focus(); // damit A und L sofort ankommen
        starteRunde();
      });
    }
  }

  function zeigeStand() {
    flaeche.querySelector("#rd-stand-links").textContent = stand.links;
    flaeche.querySelector("#rd-stand-rechts").textContent = stand.rechts;
    api.setzePunkte(`${stand.links} : ${stand.rechts}`);
  }

  function zeigeZeiten(fruehL, fruehR) {
    const text = (t, frueh) => frueh ? "Frühstart!" : (t == null ? "—" : `${t} ms`);
    flaeche.querySelector("#rd-zeit-links").textContent = text(zeit.links, fruehL);
    flaeche.querySelector("#rd-zeit-rechts").textContent = text(zeit.rechts, fruehR);
  }

  function neuesMatch() {
    stoppeTimer();
    phase = "start";
    stand = { links: 0, rechts: 0 };
    runde = 0;
    baueBuehne();
    zeigeStand();
    zeigeMitte("🚦", "Beide bereit?", `Best of 5 — wer zuerst ${SIEG_RUNDEN} Runden hat, gewinnt. Finger auf A und L!`, true);
  }

  function starteRunde() {
    stoppeTimer();
    runde++;
    zeit = { links: null, rechts: null };
    tGruen = null;
    phase = "ansage";
    flaeche.querySelectorAll(".rd-haelfte").forEach(h => h.classList.remove("rd-sieger"));
    zeigeZeiten(false, false);
    setzePhase("ansage");
    zeigeMitte("🚦", `Runde ${runde}`, "Gleich heißt es warten …");
    spaeter(() => {
      phase = "warten";
      setzePhase("warten");
      zeigeMitte("⏳", "Warte auf Grün …", "Wer zu früh drückt, schenkt dem Gegner die Runde!");
      spaeter(() => {
        phase = "gruen";
        tGruen = performance.now();
        setzePhase("gruen");
        zeigeMitte("⚡", "JETZT!", "");
        spaeter(() => rundeVorbei(false, false), NIEMAND_MS); // falls niemand drückt
      }, PAUSE_MIN_MS + Math.random() * PAUSE_SPANNE_MS);
    }, ANSAGE_MS);
  }

  function druck(seite) {
    if (phase === "warten") { // Frühstart → Runde sofort an den Gegner
      rundeVorbei(seite === "links", seite === "rechts");
      return;
    }
    if (phase !== "gruen" || zeit[seite] !== null) return;
    zeit[seite] = Math.round(performance.now() - tGruen);
    const andere = seite === "links" ? "rechts" : "links";
    if (zeit[andere] !== null) {
      rundeVorbei(false, false); // beide Zeiten da → sofort auswerten
    } else {
      spaeter(() => rundeVorbei(false, false), NACHDRUECK_MS); // kurzes Fenster für die zweite Zeit
    }
  }

  function rundeVorbei(fruehL, fruehR) {
    if (phase !== "warten" && phase !== "gruen") return; // schon entschieden
    stoppeTimer();
    phase = "ergebnis";
    setzePhase("ergebnis");
    zeigeZeiten(fruehL, fruehR);
    const sieger = rundenSieger(zeit.links, zeit.rechts, fruehL, fruehR);

    if (sieger === "keiner") {
      const grund = (zeit.links == null && zeit.rechts == null && !fruehL && !fruehR)
        ? "Niemand hat gedrückt" : "Exakt gleich schnell";
      zeigeMitte("🔁", "Unentschieden", `${grund} — die Runde wird wiederholt.`);
      runde--; // gleiche Rundennummer noch einmal
      spaeter(starteRunde, ERGEBNIS_MS);
      return;
    }

    stand[sieger]++;
    zeigeStand();
    flaeche.querySelector(sieger === "links" ? "#rd-links" : "#rd-rechts").classList.add("rd-sieger");
    const name = sieger === "links" ? "Links" : "Rechts";
    const gross = (fruehL || fruehR) ? `Frühstart — Punkt für ${name}!` : `✓ Punkt für ${name}!`;
    zeigeMitte(fruehL || fruehR ? "✗" : "🏁", gross, `Stand: ${stand.links} : ${stand.rechts}`);

    const gewinner = matchVorbei(stand.links, stand.rechts);
    if (gewinner) {
      phase = "vorbei";
      spaeter(() => zeigeEnde(gewinner), 1500);
    } else {
      spaeter(starteRunde, ERGEBNIS_MS);
    }
  }

  function zeigeEnde(gewinner) {
    const name = gewinner === "links" ? "LINKS" : "RECHTS";
    const ergebnis = gewinner === "links"
      ? `${stand.links}:${stand.rechts}` : `${stand.rechts}:${stand.links}`;
    api.zeigePanel(`<h2>Match vorbei!</h2>
      <p class="sp-endstand">Spieler <b>${name}</b> gewinnt <b>${ergebnis}</b> — Revanche?</p>
      <div class="sp-panel-knoepfe">
        <button type="button" class="knopf" id="rd-revanche">Revanche!</button>
      </div>`);
    const knopf = flaeche.parentElement.querySelector("#rd-revanche");
    if (knopf) {
      knopf.addEventListener("click", () => { api.versteckePanel(); neustart(); });
      knopf.focus();
    }
  }

  function neustart() {
    stoppeTimer();
    neuesMatch();
  }

  // Eingaben: A/L über das Gerüst (keydown auf der Fläche) + Zeiger auf den Hälften.
  // Nur einmal binden — Neustarts laufen über neuesMatch(), nicht über starte().
  api.tasten(ev => {
    if (ev.repeat) return;
    const taste = ev.key.toLowerCase();
    if (taste === "a") druck("links");
    else if (taste === "l") druck("rechts");
  });
  flaeche.addEventListener("pointerdown", ev => {
    if (ev.button !== undefined && ev.button !== 0) return; // nur Haupttaste
    if (ev.target.closest("button")) return;                // Knöpfe lösen über click aus
    const rahmen = flaeche.getBoundingClientRect();
    druck(ev.clientX < rahmen.left + rahmen.width / 2 ? "links" : "rechts");
  });

  api.neustartCb(neustart);
  neuesMatch();
}

// ---------- Browser-Start ----------
// Nur im Browser das Gerüst laden — in Node (Tests) gibt es kein document.
if (typeof document !== "undefined") {
  import("../../assets/js/spiel/geruest.js").then(m => m.starteSpielSeite({ manifest, starte }));
}
