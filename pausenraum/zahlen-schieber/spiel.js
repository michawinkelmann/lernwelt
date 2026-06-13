// spiel.js — Zahlen-Schieber (Pausenraum): 4×4-Feld, alle Kacheln in eine
// Richtung schieben, gleiche Zahlen verschmelzen genau einmal pro Zug.
// Punkte = Summe aller neu entstandenen Kacheln.
//
// Die komplette Zuglogik liegt als reine Funktionen auf Modulebene — ohne
// document/window, damit selbsttest() auch in Node läuft. Alle vier
// Richtungen entstehen durch Transponieren/Spiegeln aus dem Links-Schub.
// DOM-Aufbau und Animation passieren erst in starte(api).

export const GROESSE = 4;

export function leeresFeld(n = GROESSE) {
  return Array.from({ length: n }, () => Array(n).fill(0));
}

// Eine Zeile nach links schieben. Liefert die neue Zeile, die Punkte und die
// Wege jeder Kachel ({von, nach, fusion, wert}) für die Gleit-Animation.
// Klassische Regel: Jede Kachel verschmilzt höchstens einmal pro Zug.
export function schiebeZeile(zeile) {
  const n = zeile.length;
  const werte = [], quellen = [];
  zeile.forEach((wert, i) => { if (wert) { werte.push(wert); quellen.push(i); } });
  const neu = [], wege = [];
  let punkte = 0;
  for (let i = 0; i < werte.length; i++) {
    if (i + 1 < werte.length && werte[i] === werte[i + 1]) {
      const summe = werte[i] * 2;
      punkte += summe;
      wege.push({ von: quellen[i], nach: neu.length, fusion: true, wert: summe });
      wege.push({ von: quellen[i + 1], nach: neu.length, fusion: true, wert: summe });
      neu.push(summe);
      i++; // Partner überspringen — höchstens eine Fusion pro Kachel und Zug
    } else {
      wege.push({ von: quellen[i], nach: neu.length, fusion: false, wert: werte[i] });
      neu.push(werte[i]);
    }
  }
  while (neu.length < n) neu.push(0);
  return { zeile: neu, punkte, wege };
}

export function transponiere(feld) {
  return feld[0].map((_w, s) => feld.map(zeile => zeile[s]));
}

export function spiegle(feld) {
  return feld.map(zeile => [...zeile].reverse());
}

// In die „Links-Lage" bringen, sodass jede Richtung als Links-Schub rechenbar ist.
function inLinksLage(feld, richtung) {
  if (richtung === "rechts") return spiegle(feld);
  if (richtung === "hoch") return transponiere(feld);
  if (richtung === "runter") return spiegle(transponiere(feld));
  return feld; // links
}

function ausLinksLage(feld, richtung) {
  if (richtung === "rechts") return spiegle(feld);
  if (richtung === "hoch") return transponiere(feld);
  if (richtung === "runter") return transponiere(spiegle(feld));
  return feld; // links
}

// Zelle (Reihe r, Position i) der Links-Lage zurück in Originalkoordinaten.
function urKoordinate(r, i, richtung, n) {
  if (richtung === "rechts") return [r, n - 1 - i];
  if (richtung === "hoch") return [i, r];
  if (richtung === "runter") return [n - 1 - i, r];
  return [r, i]; // links
}

// Ganzen Zug rechnen: neues Feld, Punkte, Kachel-Wege (Originalkoordinaten)
// und ob sich überhaupt etwas bewegt/verschmolzen hat.
export function schiebe(feld, richtung) {
  const n = feld.length;
  const lage = inLinksLage(feld, richtung);
  const zeilen = [], wege = [];
  let punkte = 0, geaendert = false;
  lage.forEach((zeile, r) => {
    const erg = schiebeZeile(zeile);
    zeilen.push(erg.zeile);
    punkte += erg.punkte;
    erg.wege.forEach(w => {
      const [vonZeile, vonSpalte] = urKoordinate(r, w.von, richtung, n);
      const [nachZeile, nachSpalte] = urKoordinate(r, w.nach, richtung, n);
      if (w.fusion || vonZeile !== nachZeile || vonSpalte !== nachSpalte) geaendert = true;
      wege.push({ vonZeile, vonSpalte, nachZeile, nachSpalte, fusion: w.fusion, wert: w.wert });
    });
  });
  return { feld: ausLinksLage(zeilen, richtung), punkte, wege, geaendert };
}

export function zugMoeglich(feld, richtung) {
  return schiebe(feld, richtung).geaendert;
}

export function istVorbei(feld) {
  return ["links", "rechts", "hoch", "runter"].every(richtung => !zugMoeglich(feld, richtung));
}

// Neue Kachel auf eine freie Zelle setzen: 2 (90 %) oder 4 (10 %).
// rng ist injizierbar (Funktion → Zahl in [0;1)), damit der Test deterministisch ist.
export function spawn(feld, rng) {
  const freie = [];
  feld.forEach((zeile, z) => zeile.forEach((wert, s) => { if (!wert) freie.push([z, s]); }));
  if (!freie.length) return { feld, zeile: -1, spalte: -1, wert: 0 };
  const wahl = Math.min(freie.length - 1, Math.floor(rng() * freie.length));
  const [z, s] = freie[wahl];
  const wert = rng() < 0.9 ? 2 : 4;
  const neu = feld.map(zeile => [...zeile]);
  neu[z][s] = wert;
  return { feld: neu, zeile: z, spalte: s, wert };
}

// ---------- Selbsttest (läuft ohne Browser, z. B. in Node) ----------

export function selbsttest() {
  const fehler = [];
  let gesamt = 0;
  const pruefe = (name, bedingung) => { gesamt++; if (!bedingung) fehler.push(name); };
  const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const reihe = (eingabe, zeileSoll, punkteSoll) => {
    const erg = schiebeZeile(eingabe);
    pruefe(`schiebeZeile([${eingabe}]) → [${zeileSoll}]`, gleich(erg.zeile, zeileSoll));
    pruefe(`schiebeZeile([${eingabe}]) → ${punkteSoll} Punkte`, erg.punkte === punkteSoll);
  };

  // 1) schiebeZeile — die fünf Kernfälle
  reihe([2, 2, 2, 2], [4, 4, 0, 0], 8);
  reihe([2, 0, 2, 4], [4, 4, 0, 0], 4);
  reihe([4, 4, 8, 16], [8, 8, 16, 0], 8);
  reihe([2, 4, 2, 4], [2, 4, 2, 4], 0);
  reihe([0, 0, 0, 2], [2, 0, 0, 0], 0);

  // 2) Wege: [2,2,0,0] → beide Kacheln laufen auf Feld 0 und verschmelzen zu 4
  const wege = schiebeZeile([2, 2, 0, 0]).wege;
  pruefe("Wege: zwei Quellen", wege.length === 2);
  pruefe("Wege: Fusion auf Feld 0", wege.every(w => w.fusion && w.nach === 0 && w.wert === 4));

  // 3) transponiere / spiegle
  const beispiel = [[2, 0, 0, 2], [0, 4, 4, 0], [2, 2, 2, 2], [0, 0, 0, 8]];
  pruefe("transponiere", gleich(transponiere([[1, 2], [3, 4]]), [[1, 3], [2, 4]]));
  pruefe("transponiere zweimal = Ausgangslage", gleich(transponiere(transponiere(beispiel)), beispiel));
  pruefe("spiegle", gleich(spiegle([[1, 2, 3, 4]]), [[4, 3, 2, 1]]));
  pruefe("spiegle zweimal = Ausgangslage", gleich(spiegle(spiegle(beispiel)), beispiel));

  // 4) schiebe in alle vier Richtungen (über Transponieren/Spiegeln)
  const links = schiebe(beispiel, "links");
  pruefe("schiebe links: Feld", gleich(links.feld, [[4, 0, 0, 0], [8, 0, 0, 0], [4, 4, 0, 0], [8, 0, 0, 0]]));
  pruefe("schiebe links: 20 Punkte", links.punkte === 20);
  const rechts = schiebe(beispiel, "rechts");
  pruefe("schiebe rechts: Feld", gleich(rechts.feld, [[0, 0, 0, 4], [0, 0, 0, 8], [0, 0, 4, 4], [0, 0, 0, 8]]));
  pruefe("schiebe rechts: 20 Punkte", rechts.punkte === 20);
  const hoch = schiebe(beispiel, "hoch");
  pruefe("schiebe hoch: Feld", gleich(hoch.feld, [[4, 4, 4, 4], [0, 2, 2, 8], [0, 0, 0, 0], [0, 0, 0, 0]]));
  pruefe("schiebe hoch: 8 Punkte", hoch.punkte === 8);
  const runter = schiebe(beispiel, "runter");
  pruefe("schiebe runter: Feld", gleich(runter.feld, [[0, 0, 0, 0], [0, 0, 0, 0], [0, 4, 4, 4], [4, 2, 2, 8]]));
  pruefe("schiebe runter: 8 Punkte", runter.punkte === 8);
  pruefe("schiebe: Original bleibt unverändert",
    gleich(beispiel, [[2, 0, 0, 2], [0, 4, 4, 0], [2, 2, 2, 2], [0, 0, 0, 8]]));

  // 5) zugMoeglich
  const einzeln = [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  pruefe("zugMoeglich links: nein", zugMoeglich(einzeln, "links") === false);
  pruefe("zugMoeglich hoch: nein", zugMoeglich(einzeln, "hoch") === false);
  pruefe("zugMoeglich rechts: ja", zugMoeglich(einzeln, "rechts") === true);
  pruefe("zugMoeglich runter: ja", zugMoeglich(einzeln, "runter") === true);
  pruefe("zugMoeglich: Fusion ohne Lücke zählt als Zug",
    zugMoeglich([[2, 2, 4, 8], [4, 8, 2, 4], [8, 4, 8, 2], [2, 8, 4, 8]], "links") === true);

  // 6) istVorbei — drei Fälle
  const schachbrett = [[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]];
  pruefe("istVorbei: volles Feld ohne Paare", istVorbei(schachbrett) === true);
  pruefe("istVorbei: volles Feld mit Nachbarpaar",
    istVorbei([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 4]]) === false);
  pruefe("istVorbei: freie Zelle",
    istVorbei([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 0]]) === false);

  // 7) spawn — deterministisch mit eingespeistem Zufall
  const macheRng = werte => { let i = 0; return () => werte[i++ % werte.length]; };
  const fastVoll = schachbrett.map(zeile => [...zeile]);
  fastVoll[2][1] = 0;
  const s1 = spawn(fastVoll, macheRng([0.99, 0.95]));
  pruefe("spawn: trifft die einzige freie Zelle", s1.zeile === 2 && s1.spalte === 1);
  pruefe("spawn: 4 bei rng ≥ 0,9", s1.wert === 4 && s1.feld[2][1] === 4);
  pruefe("spawn: Original bleibt unverändert", fastVoll[2][1] === 0);
  const s2 = spawn(leeresFeld(), macheRng([0, 0.5]));
  pruefe("spawn: erste freie Zelle, Wert 2", s2.zeile === 0 && s2.spalte === 0 && s2.wert === 2);
  const s3 = spawn(leeresFeld(), macheRng([0.5, 0.95]));
  pruefe("spawn: Index 8 → Zelle (2|0), Wert 4", s3.zeile === 2 && s3.spalte === 0 && s3.wert === 4);
  const s4 = spawn(schachbrett, macheRng([0.3]));
  pruefe("spawn: volles Feld bleibt voll", s4.wert === 0 && gleich(s4.feld, schachbrett));

  return { ok: fehler.length === 0, gesamt, fehler };
}

// ---------- Manifest & Spielstart (ab hier Browser/DOM) ----------

export const manifest = {
  id: "sp-zahlen-schieber",
  titel: "Zahlen-Schieber",
  kurz: "Schiebe, verschmilz, verdopple: Aus 2 und 2 wird 4, aus 1024 irgendwann die große Zielkachel. Halb Pause, halb Kopfrechnen.",
  punkteLabel: "Punkte",
  punkteEinheit: "",
  highscore: true,
  hsRichtung: "absteigend",
  zeigeZeit: false,
  steuerungHinweis: "Pfeiltasten oder Wischen: alle Kacheln schieben — gleiche Zahlen verschmelzen."
};

export function starte(api) {
  const dok = api.flaeche.ownerDocument;
  const RAND = 8, FUGE = 8, KACHEL = 72; // Brett: 4·72 + 3·8 + 2·8 = 328 px
  const posPx = i => RAND + i * (KACHEL + FUGE);

  // ----- Brett mit 16 Hintergrundzellen -----
  api.flaeche.innerHTML = "";
  const brett = dok.createElement("div");
  brett.className = "zs-brett" + (api.reduzierteBewegung ? " zs-ruhig" : "");
  brett.setAttribute("aria-label", "Spielbrett mit 4 mal 4 Feldern");
  for (let z = 0; z < GROESSE; z++) {
    for (let s = 0; s < GROESSE; s++) {
      const zelle = dok.createElement("div");
      zelle.className = "zs-zelle";
      zelle.style.left = posPx(s) + "px";
      zelle.style.top = posPx(z) + "px";
      brett.appendChild(zelle);
    }
  }
  api.flaeche.appendChild(brett);

  const meldung = dok.createElement("p"); // Einblendung „2048! Weiter geht's."
  meldung.className = "zs-meldung";
  meldung.setAttribute("role", "status");
  meldung.hidden = true;
  api.flaeche.appendChild(meldung);

  // ----- Zustand -----
  let feld = leeresFeld();
  let kachelEls = leereElemente();
  let punkte = 0, beendet = false, gefeiert = false;
  let wartet = 0, ausstehend = null, meldungTimer = 0;

  function leereElemente() {
    return Array.from({ length: GROESSE }, () => Array(GROESSE).fill(null));
  }

  function kachelKlasse(wert) {
    return wert <= 2048 ? "k" + wert : "kgross";
  }

  // Brett komplett aus dem Feld neu aufbauen; Fusionen pulsieren, die neue Kachel ploppt.
  function rendereAlles(fusionen, neuPos) {
    brett.querySelectorAll(".zs-kachel").forEach(el => el.remove());
    kachelEls = leereElemente();
    feld.forEach((zeile, z) => zeile.forEach((wert, s) => {
      if (!wert) return;
      const el = dok.createElement("div");
      let klassen = "zs-kachel " + kachelKlasse(wert);
      if (fusionen && fusionen.has(z + "," + s)) klassen += " zs-fusion";
      if (neuPos && neuPos[0] === z && neuPos[1] === s) klassen += " zs-neu";
      el.className = klassen;
      el.textContent = wert;
      el.style.left = posPx(s) + "px";
      el.style.top = posPx(z) + "px";
      brett.appendChild(el);
      kachelEls[z][s] = el;
    }));
  }

  function zeigeMeldung(text) {
    meldung.textContent = text;
    meldung.hidden = false;
    clearTimeout(meldungTimer);
    meldungTimer = setTimeout(verbergeMeldung, 4000);
  }

  function verbergeMeldung() {
    clearTimeout(meldungTimer);
    meldung.hidden = true;
  }

  // Renderphase nach der Gleit-Animation abschließen, dann 2048/Spielende prüfen.
  function schliesse(ab) {
    rendereAlles(ab.fusionen, ab.neuPos);
    if (!gefeiert && feld.some(zeile => zeile.some(wert => wert >= 2048))) {
      gefeiert = true;
      zeigeMeldung("2048! Weiter geht's.");
    }
    if (istVorbei(feld)) {
      beendet = true;
      const groesste = Math.max(...feld.map(zeile => Math.max(...zeile)));
      api.vorbei(punkte, `<p>Kein Zug mehr möglich. Größte Kachel: <b>${groesste}</b>.</p>`);
    }
  }

  function schliesseAusstehendesAb() {
    if (!ausstehend) return;
    clearTimeout(wartet);
    const ab = ausstehend;
    ausstehend = null;
    schliesse(ab);
  }

  function zug(richtung) {
    if (beendet) return;
    schliesseAusstehendesAb(); // schnelle Folgezüge: laufende Animation sofort beenden
    const erg = schiebe(feld, richtung);
    if (!erg.geaendert) return;
    verbergeMeldung();
    feld = erg.feld;
    punkte += erg.punkte;
    api.setzePunkte(punkte);
    const neu = spawn(feld, Math.random);
    feld = neu.feld;
    const fusionen = new Set(erg.wege.filter(w => w.fusion).map(w => w.nachZeile + "," + w.nachSpalte));
    const abschluss = { fusionen, neuPos: [neu.zeile, neu.spalte] };
    if (api.reduzierteBewegung) {
      schliesse(abschluss); // keine Gleit-Animation: Kacheln erscheinen direkt
      return;
    }
    // Gleitphase: vorhandene Kacheln rutschen zu ihren Zielen (CSS-Transition)
    erg.wege.forEach(w => {
      const el = kachelEls[w.vonZeile][w.vonSpalte];
      if (el) {
        el.style.left = posPx(w.nachSpalte) + "px";
        el.style.top = posPx(w.nachZeile) + "px";
      }
    });
    ausstehend = abschluss;
    wartet = setTimeout(schliesseAusstehendesAb, 130);
  }

  function neueRunde() {
    clearTimeout(wartet);
    ausstehend = null;
    feld = leeresFeld();
    punkte = 0; beendet = false; gefeiert = false;
    verbergeMeldung();
    api.setzePunkte(0);
    feld = spawn(feld, Math.random).feld;
    feld = spawn(feld, Math.random).feld;
    rendereAlles(null, null);
  }

  // ----- Eingaben -----
  const RICHTUNGEN = { ArrowLeft: "links", ArrowRight: "rechts", ArrowUp: "hoch", ArrowDown: "runter" };
  api.tasten(ereignis => {
    const richtung = RICHTUNGEN[ereignis.key];
    if (richtung) zug(richtung);
  });
  api.wisch(richtung => {
    if (richtung !== "tipp") zug(richtung);
  });

  api.neustartCb(neueRunde);
  neueRunde(); // sofort spielbar — „Start" setzt zurück
}
