// spiel.js — Blockregen (Pausenraum): fallende Vierersteine stapeln,
// volle Reihen räumen, das Tempo steigt. Läuft im gemeinsamen Spiel-Gerüst.
//
// Aufbau wie bei den Simulationen: Die komplette Spiellogik (Steinformen,
// Rotation, Kollision, Reihenräumen, Punkte, Falltempo) liegt als reine
// Funktionen auf Modulebene — ohne document/window, damit selbsttest()
// auch in Node läuft. Alles mit DOM und Canvas passiert erst in starte(api).

// ---------- Spielfeld-Konstanten ----------

export const FELD_BREITE = 10; // Spalten
export const FELD_HOEHE = 20;  // Zeilen
export const ZELLE = 22;       // logische Zellgröße in px (Canvas)

// ---------- Die sieben Vierersteine ----------
// Eigene Namen und Buchstaben. Farben sind Design-Tokens; "schattierung"
// hellt (> 0) bzw. dunkelt (< 0) den Token-Farbton beim Zeichnen ab, damit
// aus fünf Tokens sieben unterscheidbare Färbungen entstehen.

export const STEINE = [
  { buchstabe: "S", name: "Stab",    token: "--mathe",  schattierung: 0,
    matrix: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  { buchstabe: "Q", name: "Quadrat", token: "--physik", schattierung: 0,
    matrix: [[1, 1], [1, 1]] },
  { buchstabe: "D", name: "Dach",    token: "--info",   schattierung: 0,
    matrix: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  { buchstabe: "B", name: "Blitz",   token: "--ok",     schattierung: 0,
    matrix: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  { buchstabe: "Z", name: "Zacke",   token: "--fehler", schattierung: 0,
    matrix: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
  { buchstabe: "H", name: "Haken",   token: "--mathe",  schattierung: 0.45,
    matrix: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  { buchstabe: "W", name: "Winkel",  token: "--physik", schattierung: -0.35,
    matrix: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] }
];

// Quadratische Matrix im Uhrzeigersinn drehen (reine Funktion).
export function rotiere(matrix) {
  const n = matrix.length;
  return matrix.map((zeile, z) => zeile.map((_w, s) => matrix[n - 1 - s][z]));
}

// Alle vier Rotationslagen je Stein vorberechnen: ROTATIONEN[stein][lage]
export const ROTATIONEN = STEINE.map(stein => {
  const lagen = [stein.matrix];
  for (let i = 0; i < 3; i++) lagen.push(rotiere(lagen[i]));
  return lagen;
});

export function leeresFeld() {
  return Array.from({ length: FELD_HOEHE }, () => Array(FELD_BREITE).fill(0));
}

// Passt der Stein (Matrix) mit linker oberer Ecke (x|y) ins Feld?
// Geprüft werden nur belegte Matrixzellen — leere Ränder dürfen herausragen
// (so darf der liegende Stab mit y = −1 starten, seine Zellen liegen in Zeile 0).
export function passt(feld, matrix, x, y) {
  for (let z = 0; z < matrix.length; z++) {
    for (let s = 0; s < matrix[z].length; s++) {
      if (!matrix[z][s]) continue;
      const sx = x + s, sy = y + z;
      if (sx < 0 || sx >= FELD_BREITE || sy < 0 || sy >= FELD_HOEHE) return false;
      if (feld[sy][sx]) return false;
    }
  }
  return true;
}

// Volle Reihen entfernen; oben rücken leere Reihen nach (nicht mutierend).
export function loescheVolleReihen(feld) {
  const rest = feld.filter(zeile => zeile.some(wert => !wert));
  const anzahl = feld.length - rest.length;
  const leere = Array.from({ length: anzahl }, () => Array(feld[0].length).fill(0));
  return { feld: [...leere, ...rest], anzahl };
}

// Punktetabelle: 1/2/3/4 Reihen auf einmal → 100/300/500/800, mal Stufe.
const REIHEN_PUNKTE = [0, 100, 300, 500, 800];
export function punkteFuer(anzahl, stufe) {
  return (REIHEN_PUNKTE[anzahl] || 0) * stufe;
}

// Fallintervall in Sekunden: Start 0,8 s, je Stufe ×0,85, nie unter 0,12 s.
export function fallIntervall(stufe) {
  return Math.max(0.12, 0.8 * Math.pow(0.85, stufe - 1));
}

// Endlage beim harten Fall: tiefstes y, an dem der Stein noch passt.
export function hardDropY(feld, matrix, x, y) {
  let ziel = y;
  while (passt(feld, matrix, x, ziel + 1)) ziel++;
  return ziel;
}

// ---------- Selbsttest (läuft ohne Browser, z. B. in Node) ----------

export function selbsttest() {
  const fehler = [];
  let gesamt = 0;
  const pruefe = (name, bedingung) => { gesamt++; if (!bedingung) fehler.push(name); };
  const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // 1) Sieben Steine, je vier Rotationslagen, je genau vier Zellen
  pruefe("7 Steine definiert", STEINE.length === 7 && ROTATIONEN.length === 7);
  ROTATIONEN.forEach((lagen, i) => {
    pruefe(`${STEINE[i].name}: 4 Rotationslagen`, lagen.length === 4);
    lagen.forEach((m, l) =>
      pruefe(`${STEINE[i].name}, Lage ${l}: genau 4 Zellen`,
        m.flat().filter(Boolean).length === 4));
  });
  pruefe("Stein-Buchstaben eindeutig", new Set(STEINE.map(s => s.buchstabe)).size === 7);

  // 2) rotiere: viermal im Uhrzeigersinn = Ausgangslage
  STEINE.forEach(stein => {
    let m = stein.matrix;
    for (let i = 0; i < 4; i++) m = rotiere(m);
    pruefe(`rotiere viermal = Ausgangslage (${stein.name})`, gleich(m, stein.matrix));
  });
  pruefe("rotiere: Dach einmal gedreht",
    gleich(rotiere(STEINE[2].matrix), [[0, 1, 0], [0, 1, 1], [0, 1, 0]]));

  // 3) passt: Wände, Boden, Kollision
  const leer = leeresFeld();
  const quadrat = STEINE[1].matrix;
  pruefe("passt: frei", passt(leer, quadrat, 4, 0) === true);
  pruefe("passt: linke Wand", passt(leer, quadrat, -1, 0) === false);
  pruefe("passt: rechte Wand", passt(leer, quadrat, FELD_BREITE - 1, 0) === false);
  pruefe("passt: Boden", passt(leer, quadrat, 4, FELD_HOEHE - 1) === false);
  pruefe("passt: unterste gültige Zeile", passt(leer, quadrat, 4, FELD_HOEHE - 2) === true);
  const belegt = leeresFeld();
  belegt[5][4] = 3;
  pruefe("passt: Kollision", passt(belegt, quadrat, 4, 4) === false);
  pruefe("passt: daneben frei", passt(belegt, quadrat, 5, 4) === true);
  pruefe("passt: leere Matrixzeile darf herausragen", passt(leer, STEINE[0].matrix, 3, -1) === true);

  // 4) loescheVolleReihen — drei Beispiel-Felder
  const a = leeresFeld();
  a[19] = Array(FELD_BREITE).fill(1);
  a[18][0] = 2;
  const ergA = loescheVolleReihen(a);
  pruefe("räumen A: eine Reihe", ergA.anzahl === 1);
  pruefe("räumen A: Rest rutscht nach unten", ergA.feld[19][0] === 2 && ergA.feld[19][1] === 0);
  pruefe("räumen A: Höhe bleibt 20", ergA.feld.length === FELD_HOEHE);

  const b = leeresFeld();
  b[17] = Array(FELD_BREITE).fill(4);
  b[19] = Array(FELD_BREITE).fill(5);
  b[18][3] = 6;
  const ergB = loescheVolleReihen(b);
  pruefe("räumen B: zwei Reihen", ergB.anzahl === 2);
  pruefe("räumen B: Zwischenreihe landet unten", ergB.feld[19][3] === 6 && ergB.feld[19][0] === 0);
  pruefe("räumen B: oben zwei neue Leerreihen",
    ergB.feld[0].every(w => w === 0) && ergB.feld[1].every(w => w === 0));

  const c = leeresFeld();
  c[19][0] = 1;
  const ergC = loescheVolleReihen(c);
  pruefe("räumen C: nichts voll", ergC.anzahl === 0);
  pruefe("räumen C: Feld unverändert", gleich(ergC.feld, c));

  // 5) punkteFuer — Punktetabelle 100/300/500/800 mal Stufe
  pruefe("punkteFuer(0, 3) = 0", punkteFuer(0, 3) === 0);
  pruefe("punkteFuer(1, 1) = 100", punkteFuer(1, 1) === 100);
  pruefe("punkteFuer(2, 1) = 300", punkteFuer(2, 1) === 300);
  pruefe("punkteFuer(3, 2) = 1000", punkteFuer(3, 2) === 1000);
  pruefe("punkteFuer(4, 3) = 2400", punkteFuer(4, 3) === 2400);
  pruefe("punkteFuer(1, 4) = 400", punkteFuer(1, 4) === 400);

  // 6) fallIntervall: 0,8 s → ×0,85 je Stufe → Untergrenze 0,12 s
  pruefe("fallIntervall(1) = 0,8 s", Math.abs(fallIntervall(1) - 0.8) < 1e-9);
  pruefe("fallIntervall(2) = 0,68 s", Math.abs(fallIntervall(2) - 0.68) < 1e-9);
  pruefe("fallIntervall: Untergrenze 0,12 s", fallIntervall(40) === 0.12);

  // 7) Hard-Drop-Endlage ist deterministisch
  pruefe("Hard-Drop: Quadrat auf leerem Feld → Zeile 18", hardDropY(leer, quadrat, 4, 0) === 18);
  const hindernis = leeresFeld();
  hindernis[19][4] = 1;
  pruefe("Hard-Drop: Quadrat über Hindernis → Zeile 17", hardDropY(hindernis, quadrat, 4, 0) === 17);
  pruefe("Hard-Drop: liegender Stab → Zeile 18", hardDropY(leer, STEINE[0].matrix, 3, -1) === 18);
  pruefe("Hard-Drop: wiederholt gerechnet, gleiche Endlage",
    hardDropY(hindernis, quadrat, 4, 0) === hardDropY(hindernis, quadrat, 4, 0));

  return { ok: fehler.length === 0, gesamt, fehler };
}

// ---------- Manifest & Spielstart (ab hier Browser/DOM) ----------

export const manifest = {
  id: "sp-blockregen",
  titel: "Blockregen",
  kurz: "Fallende Blöcke, volle Reihen, steigendes Tempo — der zeitlose Stapel-Klassiker mit lokaler Bestenliste.",
  punkteLabel: "Punkte",
  punkteEinheit: "",
  highscore: true,
  hsRichtung: "absteigend",
  zeigeZeit: false,
  steuerungHinweis: "← → bewegen · ↑ drehen · ↓ schnell · Leertaste: ganz runter. Touch: wischen, tippen dreht."
};

export function starte(api) {
  const dok = api.flaeche.ownerDocument;
  const fenster = dok.defaultView;

  // ----- Canvas mit Seitenpanel (nächster Stein, Stufe, Reihen) -----
  const RAND = 10;
  const PANEL_X = RAND + FELD_BREITE * ZELLE + 12;
  const PANEL_B = 96;
  const BREITE = PANEL_X + PANEL_B + RAND; // 348 logische px
  const HOEHE = FELD_HOEHE * ZELLE + 2 * RAND; // 460 logische px
  const dpr = Math.max(1, fenster.devicePixelRatio || 1);

  api.flaeche.innerHTML = "";
  const canvas = dok.createElement("canvas");
  canvas.width = Math.round(BREITE * dpr);
  canvas.height = Math.round(HOEHE * dpr);
  canvas.style.maxWidth = BREITE + "px";
  canvas.style.margin = "10px auto";
  api.flaeche.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Bildschirmtasten für Touch-Geräte (unterhalb der Spielfläche)
  const touchTasten = dok.createElement("div");
  touchTasten.className = "spiel-touch-tasten nur-touch";
  touchTasten.innerHTML = `
    <button type="button" data-tat="links" aria-label="Nach links">◀</button>
    <button type="button" data-tat="drehen" aria-label="Drehen">⟳</button>
    <button type="button" data-tat="rechts" aria-label="Nach rechts">▶</button>
    <button type="button" data-tat="sturz" aria-label="Ganz nach unten" style="grid-column:2">⤓</button>`;
  api.flaeche.insertAdjacentElement("afterend", touchTasten);

  // ----- Spielzustand -----
  let feld = leeresFeld();
  let steinIdx = 0, lage = 0, x = 3, y = 0, naechster = 0;
  let punkte = 0, reihen = 0, stufe = 1;
  let akku = 0, uhr = 0, weichBis = -1;
  let aktiv = false, begonnen = false;

  const zufallsIdx = () => Math.floor(Math.random() * STEINE.length);
  const matrixJetzt = () => ROTATIONEN[steinIdx][lage];

  function spawne() {
    steinIdx = naechster;
    naechster = zufallsIdx();
    lage = 0;
    const m = matrixJetzt();
    x = Math.floor((FELD_BREITE - m.length) / 2);
    let oberste = 0;
    while (oberste < m.length && m[oberste].every(wert => !wert)) oberste++;
    y = -oberste;
    if (!passt(feld, m, x, y)) { // Stapel hat oben angeschlagen
      aktiv = false;
      zeichne();
      api.vorbei(punkte, `<p>Stufe ${stufe} erreicht, ${reihen} Reihen geräumt — dann war das Feld voll.</p>`);
    }
  }

  function fixiere() {
    const m = matrixJetzt();
    m.forEach((zeile, z) => zeile.forEach((wert, s) => {
      if (wert) feld[y + z][x + s] = steinIdx + 1;
    }));
    const erg = loescheVolleReihen(feld);
    feld = erg.feld;
    if (erg.anzahl > 0) {
      punkte += punkteFuer(erg.anzahl, stufe);
      reihen += erg.anzahl;
      stufe = Math.floor(reihen / 10) + 1;
      api.setzePunkte(punkte);
    }
    akku = 0;
    weichBis = -1;
    spawne();
  }

  function bewege(richtung) {
    if (passt(feld, matrixJetzt(), x + richtung, y)) x += richtung;
  }

  function drehe() { // im Uhrzeigersinn, mit einfachem Wandabstoß
    const neueLage = (lage + 1) % 4;
    const m = ROTATIONEN[steinIdx][neueLage];
    for (const versatz of [0, -1, 1]) {
      if (passt(feld, m, x + versatz, y)) { lage = neueLage; x += versatz; return; }
    }
  }

  function schrittRunter() {
    if (passt(feld, matrixJetzt(), x, y + 1)) { y++; return; }
    fixiere();
  }

  function weichRunter() { // ↓: ein Schritt sofort + kurzes Fenster mit Intervall/10
    weichBis = uhr + 0.3;
    akku = 0;
    if (passt(feld, matrixJetzt(), x, y + 1)) y++;
  }

  function sturz() { // Leertaste: harter Fall, +2 Punkte je Zelle
    const ziel = hardDropY(feld, matrixJetzt(), x, y);
    punkte += 2 * (ziel - y);
    y = ziel;
    api.setzePunkte(punkte);
    fixiere();
  }

  function weichStoss() { // Touch: Wisch nach unten = bis zu 3 Zellen
    for (let i = 0; i < 3; i++) {
      if (!passt(feld, matrixJetzt(), x, y + 1)) break;
      y++;
    }
  }

  function update(dt) {
    if (!aktiv) return;
    uhr += dt;
    akku += dt;
    const basis = fallIntervall(stufe);
    const intervall = uhr < weichBis ? basis / 10 : basis;
    while (aktiv && akku >= intervall) {
      akku -= intervall;
      schrittRunter();
    }
    if (aktiv) zeichne();
  }

  // ----- Zeichnen (Farben kommen pro Bild frisch aus den Design-Tokens,
  //       damit auch der Dunkelmodus-Wechsel sofort greift) -----
  function farben() {
    const stil = fenster.getComputedStyle(dok.documentElement);
    const t = name => stil.getPropertyValue(name).trim();
    return {
      hauch: t("--hauch"), linie: t("--linie"),
      text: t("--text"), leise: t("--text-leise"),
      stein: STEINE.map(s => t(s.token))
    };
  }

  function malZelle(px, py, groesse, farbe, schattierung) {
    ctx.fillStyle = farbe;
    ctx.fillRect(px, py, groesse, groesse);
    if (schattierung > 0) {
      ctx.fillStyle = `rgba(255,255,255,${schattierung})`;
      ctx.fillRect(px, py, groesse, groesse);
    } else if (schattierung < 0) {
      ctx.fillStyle = `rgba(0,0,0,${-schattierung})`;
      ctx.fillRect(px, py, groesse, groesse);
    }
    ctx.fillStyle = "rgba(255,255,255,0.3)"; // Lichtkante oben/links
    ctx.fillRect(px, py, groesse, 2);
    ctx.fillRect(px, py, 2, groesse);
    ctx.fillStyle = "rgba(0,0,0,0.22)"; // Schattenkante unten/rechts
    ctx.fillRect(px, py + groesse - 2, groesse, 2);
    ctx.fillRect(px + groesse - 2, py, 2, groesse);
  }

  function malMatrix(m, px0, py0, groesse, idx, deckkraft, f) {
    ctx.globalAlpha = deckkraft;
    m.forEach((zeile, z) => zeile.forEach((wert, s) => {
      if (wert) malZelle(px0 + s * groesse, py0 + z * groesse, groesse, f.stein[idx], STEINE[idx].schattierung);
    }));
    ctx.globalAlpha = 1;
  }

  function zeichne() {
    const f = farben();
    const schriftart = fenster.getComputedStyle(canvas).fontFamily || "sans-serif";
    ctx.clearRect(0, 0, BREITE, HOEHE);

    // Spielfeld-Hintergrund, Gitter, Rahmen
    ctx.fillStyle = f.hauch;
    ctx.fillRect(RAND, RAND, FELD_BREITE * ZELLE, FELD_HOEHE * ZELLE);
    ctx.strokeStyle = f.linie;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    for (let s = 1; s < FELD_BREITE; s++) {
      ctx.moveTo(RAND + s * ZELLE + 0.5, RAND);
      ctx.lineTo(RAND + s * ZELLE + 0.5, RAND + FELD_HOEHE * ZELLE);
    }
    for (let z = 1; z < FELD_HOEHE; z++) {
      ctx.moveTo(RAND, RAND + z * ZELLE + 0.5);
      ctx.lineTo(RAND + FELD_BREITE * ZELLE, RAND + z * ZELLE + 0.5);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeRect(RAND - 0.5, RAND - 0.5, FELD_BREITE * ZELLE + 1, FELD_HOEHE * ZELLE + 1);

    // Liegende Steine
    feld.forEach((zeile, z) => zeile.forEach((wert, s) => {
      if (wert) malZelle(RAND + s * ZELLE, RAND + z * ZELLE, ZELLE, f.stein[wert - 1], STEINE[wert - 1].schattierung);
    }));

    // Aktueller Stein + Schattenlage (zeigt die Endlage des harten Falls)
    if (begonnen && aktiv) {
      const m = matrixJetzt();
      const ziel = hardDropY(feld, m, x, y);
      if (ziel > y) malMatrix(m, RAND + x * ZELLE, RAND + ziel * ZELLE, ZELLE, steinIdx, 0.18, f);
      malMatrix(m, RAND + x * ZELLE, RAND + y * ZELLE, ZELLE, steinIdx, 1, f);
    }

    // Seitenpanel: Vorschau, Stufe, Reihen
    ctx.fillStyle = f.leise;
    ctx.font = `600 13px ${schriftart}`;
    ctx.fillText("Nächster", PANEL_X, RAND + 16);
    const KASTEN = 4 * 16 + 8;
    ctx.fillStyle = f.hauch;
    ctx.fillRect(PANEL_X, RAND + 24, KASTEN, KASTEN);
    ctx.strokeStyle = f.linie;
    ctx.strokeRect(PANEL_X + 0.5, RAND + 24.5, KASTEN - 1, KASTEN - 1);
    if (begonnen) {
      const vm = ROTATIONEN[naechster][0];
      const abstand = (KASTEN - vm.length * 16) / 2;
      malMatrix(vm, PANEL_X + abstand, RAND + 24 + abstand, 16, naechster, 1, f);
    }
    ctx.fillStyle = f.leise;
    ctx.font = `600 13px ${schriftart}`;
    ctx.fillText("Stufe", PANEL_X, RAND + 140);
    ctx.fillText("Reihen", PANEL_X, RAND + 196);
    ctx.fillStyle = f.text;
    ctx.font = `700 22px ${schriftart}`;
    ctx.fillText(String(stufe), PANEL_X, RAND + 166);
    ctx.fillText(String(reihen), PANEL_X, RAND + 222);

    // Ruhebild vor dem ersten Start
    if (!begonnen) {
      const mitteX = RAND + (FELD_BREITE * ZELLE) / 2;
      ctx.textAlign = "center";
      ctx.fillStyle = f.text;
      ctx.font = `700 16px ${schriftart}`;
      ctx.fillText("Drück auf Start!", mitteX, 200);
      ctx.fillStyle = f.leise;
      ctx.font = `400 13px ${schriftart}`;
      ctx.fillText("Volle Reihen verschwinden —", mitteX, 226);
      ctx.fillText("lass keine Lücken.", mitteX, 244);
      ctx.textAlign = "left";
    }
  }

  function neueRunde() {
    feld = leeresFeld();
    punkte = 0; reihen = 0; stufe = 1;
    akku = 0; uhr = 0; weichBis = -1;
    begonnen = true; aktiv = true;
    naechster = zufallsIdx();
    api.setzePunkte(0);
    spawne();
    if (aktiv) api.loop(update);
  }

  // ----- Eingaben -----
  api.tasten(ereignis => {
    if (!aktiv) return;
    switch (ereignis.key) {
      case "ArrowLeft": bewege(-1); break;
      case "ArrowRight": bewege(1); break;
      case "ArrowUp": drehe(); break;
      case "ArrowDown": weichRunter(); break;
      case " ": sturz(); break;
      default: return;
    }
    if (aktiv) zeichne();
  });

  api.wisch(richtung => {
    if (!aktiv) return;
    if (richtung === "links") bewege(-1);
    else if (richtung === "rechts") bewege(1);
    else if (richtung === "runter") weichStoss();
    else drehe(); // "tipp" und "hoch"
    if (aktiv) zeichne();
  });

  touchTasten.addEventListener("click", ereignis => {
    const knopf = ereignis.target.closest("button");
    if (!knopf || !aktiv) return;
    const tat = knopf.dataset.tat;
    if (tat === "links") bewege(-1);
    else if (tat === "rechts") bewege(1);
    else if (tat === "drehen") drehe();
    else if (tat === "sturz") sturz();
    if (aktiv) zeichne();
    api.flaeche.focus({ preventScroll: true });
  });

  api.neustartCb(neueRunde);
  zeichne(); // Ruhebild, bis „Start" gedrückt wird
}
