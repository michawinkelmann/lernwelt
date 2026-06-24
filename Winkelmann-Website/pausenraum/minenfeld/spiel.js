// spiel.js — Minenfeld (Minesweeper): Zahlen lesen, sichere Felder aufdecken,
// Fahnen setzen. Läuft im gemeinsamen Spiel-Gerüst (assets/js/spiel/geruest.js):
// Dieses Modul liefert manifest + starte(api).
//
// Testbarkeit wie bei den Simulationen: Die reine Spiellogik (Minen legen,
// Nachbarn zählen, Flutung, Sieg, Fahnen-Zyklus) steht DOM-frei auf Modulebene
// und läuft per selbsttest() auch in Node — deterministisch dank Seed-RNG.
// Alles mit document/window lebt ausschließlich in starte().
//
// Bestenliste: nur für die Größe Klein (9×9), Sekunden aufsteigend. Bei Mittel
// und Groß endet die Runde mit einem eigenen Panel ohne Eintrag (im Hilfetext
// der Seite erklärt). prefers-reduced-motion: keine Explosions-Animation,
// das Ergebnis erscheint nur als Symbol + Text (Klasse mf-anim entfällt,
// zusätzlich greift die CSS-Media-Query).

export const manifest = {
  id: "sp-minenfeld",
  titel: "Minenfeld",
  kurz: "Die Zahlen verraten, wo die Minen liegen: logisch kombinieren, Felder aufdecken, Fahnen setzen — die Denkpause schlechthin.",
  punkteLabel: "Zeit",
  punkteEinheit: "", // Einheit steckt bereits in formatPunkte — sonst stünde im Panel "12 s s"
  hsRichtung: "aufsteigend",
  highscore: true,
  zeigeZeit: true,
  formatPunkte: s => s + " s",
  steuerungHinweis: "Klick/Tipp deckt auf — langer Druck oder Rechtsklick setzt eine Fahne."
};

// ===== Schwierigkeiten (Bestenliste nur für Klein) =====
export const SCHWIERIGKEITEN = {
  klein:  { name: "Klein",  breite: 9,  hoehe: 9,  minen: 10, bestenliste: true },
  mittel: { name: "Mittel", breite: 12, hoehe: 12, minen: 22, bestenliste: false },
  gross:  { name: "Groß",   breite: 16, hoehe: 16, minen: 40, bestenliste: false }
};
export const LONGPRESS_MS = 450;

// ===== Reine Logik (DOM-frei, in Node testbar) =====
// Feld = { breite, hoehe, zellen: [{ mine, offen, fahne (0 leer | 1 Fahne | 2 ?), zahl }] }

export function leeresFeld(breite, hoehe) {
  return {
    breite, hoehe,
    zellen: Array.from({ length: breite * hoehe }, () => ({ mine: false, offen: false, fahne: 0, zahl: 0 }))
  };
}

export function index(feld, x, y) { return y * feld.breite + x; }

export function imFeld(feld, x, y) { return x >= 0 && y >= 0 && x < feld.breite && y < feld.hoehe; }

// Alle gültigen Nachbarkoordinaten (bis zu 8)
export function nachbarn(feld, x, y) {
  const liste = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (imFeld(feld, x + dx, y + dy)) liste.push([x + dx, y + dy]);
    }
  }
  return liste;
}

// 3×3-Sperrzone um den Erstklick (am Rand entsprechend kleiner) als Index-Set
export function sperrzone3x3(breite, hoehe, x, y) {
  const zone = new Set();
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < breite && ny < hoehe) zone.add(ny * breite + nx);
    }
  }
  return zone;
}

// Seed-RNG (mulberry32): gleiche Saat → gleiche Zahlenfolge → testbare Minenlage
export function erzeugeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Legt `anzahl` Minen, nie in der Sperrzone (Erstklick-Garantie). Mischung per
// Fisher-Yates mit übergebenem RNG; mehr Minen als freie Plätze werden gekappt.
export function platziereMinen(breite, hoehe, anzahl, sperrzone = new Set(), rng = Math.random) {
  const feld = leeresFeld(breite, hoehe);
  const kandidaten = [];
  for (let i = 0; i < breite * hoehe; i++) {
    if (!sperrzone.has(i)) kandidaten.push(i);
  }
  for (let i = kandidaten.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [kandidaten[i], kandidaten[j]] = [kandidaten[j], kandidaten[i]];
  }
  const n = Math.min(anzahl, kandidaten.length);
  for (let k = 0; k < n; k++) feld.zellen[kandidaten[k]].mine = true;
  return zaehleNachbarn(feld);
}

// Trägt in jede Zelle die Zahl der Nachbarminen ein (auch in Minenzellen — unschädlich)
export function zaehleNachbarn(feld) {
  for (let y = 0; y < feld.hoehe; y++) {
    for (let x = 0; x < feld.breite; x++) {
      let n = 0;
      for (const [nx, ny] of nachbarn(feld, x, y)) {
        if (feld.zellen[ny * feld.breite + nx].mine) n++;
      }
      feld.zellen[y * feld.breite + x].zahl = n;
    }
  }
  return feld;
}

// Deckt (x, y) auf; 0-Felder fluten die freie Umgebung (Flood-Fill, iterativ).
// Fahnenfelder (fahne === 1) bleiben zu. Liefert die geöffneten Indizes.
export function fluteAuf(feld, x, y) {
  const geoeffnet = [];
  if (!imFeld(feld, x, y)) return geoeffnet;
  const start = feld.zellen[index(feld, x, y)];
  if (start.offen || start.fahne === 1) return geoeffnet;
  const stapel = [[x, y]];
  while (stapel.length) {
    const [cx, cy] = stapel.pop();
    const i = index(feld, cx, cy);
    const zelle = feld.zellen[i];
    if (zelle.offen || zelle.fahne === 1) continue;
    zelle.offen = true;
    zelle.fahne = 0;
    geoeffnet.push(i);
    if (zelle.zahl === 0 && !zelle.mine) {
      for (const [nx, ny] of nachbarn(feld, cx, cy)) {
        const nZelle = feld.zellen[ny * feld.breite + nx];
        if (!nZelle.offen && !nZelle.mine && nZelle.fahne !== 1) stapel.push([nx, ny]);
      }
    }
  }
  return geoeffnet;
}

// Gewonnen, sobald alle Nicht-Minen-Felder offen sind (Fahnen sind egal)
export function sieg(feld) {
  return feld.zellen.every(zelle => zelle.mine || zelle.offen);
}

// Fahnen-Zyklus: leer (0) → Fahne (1) → Fragezeichen (2) → leer (0)
export function fahneWeiter(fahne) { return (fahne + 1) % 3; }

// Nur 🚩 zählt für den Minenzähler (Fragezeichen nicht)
export function zaehleFahnen(feld) {
  return feld.zellen.filter(zelle => zelle.fahne === 1).length;
}

// ===== Selbsttest (läuft in Node: import("./spiel.js").then(m => m.selbsttest())) =====
export function selbsttest() {
  const faelle = [];
  const pruefe = (name, ok, detail = "") => faelle.push({ name, ok: !!ok, detail: String(detail) });
  const minenIndizes = feld => feld.zellen.map((zelle, i) => zelle.mine ? i : -1).filter(i => i >= 0);

  // Minen legen: exakte Anzahl
  const f1 = platziereMinen(9, 9, 10, new Set(), erzeugeRng(1));
  pruefe("9×9: exakt 10 Minen gelegt", minenIndizes(f1).length === 10, minenIndizes(f1).join(","));

  // Sperrzone (3×3 um den Erstklick) bleibt bei vielen Seeds frei
  let sperrOk = true;
  for (let seed = 1; seed <= 8; seed++) {
    const zone = sperrzone3x3(9, 9, 4, 4);
    const f = platziereMinen(9, 9, 10, zone, erzeugeRng(seed));
    if (minenIndizes(f).some(i => zone.has(i))) sperrOk = false;
  }
  pruefe("Sperrzone bleibt bei 8 Seeds minenfrei", sperrOk);

  // Sperrzone in der Ecke: nur 4 Zellen
  const ecke = sperrzone3x3(9, 9, 0, 0);
  pruefe("Sperrzone an Ecke (0,0) = 4 Zellen", ecke.size === 4 && ecke.has(0) && ecke.has(1) && ecke.has(9) && ecke.has(10));

  // Deterministisch mit Seed
  const a = minenIndizes(platziereMinen(16, 16, 40, new Set(), erzeugeRng(42))).join(",");
  const b = minenIndizes(platziereMinen(16, 16, 40, new Set(), erzeugeRng(42))).join(",");
  const c = minenIndizes(platziereMinen(16, 16, 40, new Set(), erzeugeRng(7))).join(",");
  pruefe("Gleicher Seed → identische Minenlage", a === b);
  pruefe("Anderer Seed → andere Minenlage", a !== c);

  // Mehr Minen als freie Plätze → gekappt
  const klein = platziereMinen(2, 2, 10, new Set([0]), erzeugeRng(3));
  pruefe("Minenzahl wird auf freie Plätze gekappt", minenIndizes(klein).length === 3);

  // Nachbarzahlen: 3×3 mit Minen in (0,0) und (2,2) — von Hand geprüft
  const f6 = leeresFeld(3, 3);
  f6.zellen[0].mine = true;
  f6.zellen[8].mine = true;
  zaehleNachbarn(f6);
  const erwartet6 = [0, 1, 0, 1, 2, 1, 0, 1, 0];
  pruefe("Nachbarzahlen Beispielfeld exakt [0,1,0,1,2,1,0,1,0]",
    f6.zellen.every((zelle, i) => zelle.zahl === erwartet6[i]),
    f6.zellen.map(zelle => zelle.zahl).join(","));

  // Maximalfall: Mitte von 8 Minen umzingelt
  const f7 = leeresFeld(3, 3);
  f7.zellen.forEach((zelle, i) => { if (i !== 4) zelle.mine = true; });
  zaehleNachbarn(f7);
  pruefe("Acht Nachbarminen → Zahl 8", f7.zellen[4].zahl === 8);

  // Flutung: 5×5 mit 1 Mine in (0,0), Klick auf (4,4) → exakt die 24 Nicht-Minen-Felder
  const baue5 = () => {
    const f = leeresFeld(5, 5);
    f.zellen[0].mine = true;
    return zaehleNachbarn(f);
  };
  const f8 = baue5();
  const offen8 = fluteAuf(f8, 4, 4).slice().sort((p, q) => p - q);
  const erwartet8 = Array.from({ length: 24 }, (_u, i) => i + 1); // Indizes 1–24, Mine (0) bleibt zu
  pruefe("Flutung öffnet exakt die 24 Nicht-Minen-Felder",
    offen8.length === 24 && offen8.every((wert, i) => wert === erwartet8[i]) && !f8.zellen[0].offen,
    offen8.join(","));

  // Klick auf ein Zahlfeld öffnet nur dieses
  const f9 = baue5();
  const offen9 = fluteAuf(f9, 1, 1); // (1,1) trägt die Zahl 1
  pruefe("Zahlfeld öffnet nur sich selbst", offen9.length === 1 && offen9[0] === 6 && f9.zellen[6].offen);

  // Fahne blockiert die Flutung
  const f10 = baue5();
  f10.zellen[4].fahne = 1; // (4,0), ein 0-Feld
  const offen10 = fluteAuf(f10, 4, 4);
  pruefe("Fahnenfeld bleibt bei Flutung zu", offen10.length === 23 && !f10.zellen[4].offen, offen10.length);

  // Bereits offenes Feld liefert keine neue Öffnung
  const offen11 = fluteAuf(f9, 1, 1);
  pruefe("Offenes Feld flutet nicht erneut", offen11.length === 0);

  // Siegprüfung
  const f12 = baue5();
  fluteAuf(f12, 4, 4);
  pruefe("Alle sicheren Felder offen → Sieg", sieg(f12) === true);
  const f13 = baue5();
  fluteAuf(f13, 1, 1); // nur ein einzelnes Zahlfeld offen
  pruefe("Sichere Felder noch zu → kein Sieg", sieg(f13) === false);

  // Fahnen-Zyklus und Zähler
  pruefe("Fahnen-Zyklus 0→1→2→0", fahneWeiter(0) === 1 && fahneWeiter(1) === 2 && fahneWeiter(2) === 0);
  const f14 = leeresFeld(2, 2);
  f14.zellen[0].fahne = 1;
  f14.zellen[1].fahne = 2;
  f14.zellen[2].fahne = 1;
  pruefe("Nur 🚩 zählt als Fahne (nicht ?)", zaehleFahnen(f14) === 2);

  return { gesamt: faelle.length, bestanden: faelle.filter(f => f.ok).length, faelle };
}

// ===== Browser-Teil: DOM-Gitter + Eingaben (nur hier document/window) =====
export function starte(api) {
  // --- Aufbau: Schwierigkeitswahl + Knopf-Gitter + Statuszeile ---
  const innen = document.createElement("div");
  innen.className = "mf-innen";
  const wahlHtml = Object.entries(SCHWIERIGKEITEN).map(([schluessel, s], i) =>
    `<label class="mf-stufe"><input type="radio" name="mf-stufe" value="${schluessel}"${i === 0 ? " checked" : ""}>
     <span>${s.name} (${s.breite}×${s.hoehe}, ${s.minen} Minen)</span></label>`).join("");
  innen.innerHTML = `
    <fieldset class="mf-wahl"><legend>Schwierigkeit:</legend>${wahlHtml}</fieldset>
    <div class="mf-scroll"><div class="mf-gitter" role="group" aria-label="Minenfeld-Gitter"></div></div>
    <p class="mf-status" aria-live="polite"></p>`;
  api.flaeche.innerHTML = "";
  api.flaeche.appendChild(innen);

  // Minenzähler (Minen − Fahnen) in der Kopfzeile ergänzen
  const minenInfo = document.createElement("span");
  minenInfo.className = "spiel-minen";
  minenInfo.innerHTML = `Minen übrig: <b>0</b>`;
  api.kopf.appendChild(minenInfo);
  const minenEl = minenInfo.querySelector("b");

  const gitter = innen.querySelector(".mf-gitter");
  const status = innen.querySelector(".mf-status");

  let stufe = SCHWIERIGKEITEN.klein;
  let feld = null;
  let knoepfe = [];
  let modus = "bereit"; // bereit (Minen noch nicht gelegt) | laeuft | vorbei
  let zeit = 0;
  let letzteSekunde = -1;

  const posText = i => `Reihe ${Math.floor(i / feld.breite) + 1}, Spalte ${(i % feld.breite) + 1}`;

  function aktualisiereMinenzaehler() {
    minenEl.textContent = String(stufe.minen - zaehleFahnen(feld));
  }

  function aktualisiereZelle(i) {
    const zelle = feld.zellen[i];
    const k = knoepfe[i];
    k.classList.toggle("mf-offen", zelle.offen);
    delete k.dataset.z;
    if (zelle.offen) {
      k.disabled = true;
      if (zelle.mine) {
        k.textContent = "💣";
        k.setAttribute("aria-label", `${posText(i)}: Mine`);
      } else if (zelle.zahl > 0) {
        k.textContent = String(zelle.zahl);
        k.dataset.z = String(zelle.zahl);
        k.setAttribute("aria-label", `${posText(i)}: ${zelle.zahl === 1 ? "1 Mine" : zelle.zahl + " Minen"} angrenzend`);
      } else {
        k.textContent = "";
        k.setAttribute("aria-label", `${posText(i)}: frei`);
      }
    } else {
      k.disabled = false;
      k.textContent = zelle.fahne === 1 ? "🚩" : zelle.fahne === 2 ? "?" : "";
      k.setAttribute("aria-label",
        `${posText(i)}: ${zelle.fahne === 1 ? "Fahne gesetzt" : zelle.fahne === 2 ? "Fragezeichen" : "verdeckt"}`);
    }
  }

  function bauGitter() {
    gitter.style.gridTemplateColumns = `repeat(${feld.breite}, 36px)`;
    gitter.innerHTML = "";
    knoepfe = [];
    for (let i = 0; i < feld.zellen.length; i++) {
      const k = document.createElement("button");
      k.type = "button";
      k.className = "mf-zelle";
      k.dataset.i = String(i);
      gitter.appendChild(k);
      knoepfe.push(k);
      aktualisiereZelle(i);
    }
  }

  function reset() {
    api.loopStopp();
    feld = leeresFeld(stufe.breite, stufe.hoehe);
    modus = "bereit";
    zeit = 0;
    letzteSekunde = -1;
    api.setzePunkte(0);
    api.setzeZeit("0 s");
    bauGitter();
    aktualisiereMinenzaehler();
    status.textContent = "Der erste Klick ist nie eine Mine — leg einfach los!";
  }
  api.neustartCb(reset);

  function tick(dt) {
    zeit += dt;
    const s = Math.floor(zeit);
    if (s !== letzteSekunde) {
      letzteSekunde = s;
      api.setzeZeit(`${s} s`);
      api.setzePunkte(s);
    }
  }

  // Erstklick: Minen erst jetzt legen — 3×3 um die Klickzelle bleibt garantiert frei
  function erstklick(x, y) {
    const zone = sperrzone3x3(feld.breite, feld.hoehe, x, y);
    const neu = platziereMinen(feld.breite, feld.hoehe, stufe.minen, zone, Math.random);
    feld.zellen.forEach((zelle, i) => { if (zelle.fahne) neu.zellen[i].fahne = zelle.fahne; }); // Fahnen mitnehmen
    feld = neu;
    modus = "laeuft";
    zeit = 0;
    letzteSekunde = -1;
    api.loop(tick); // Stoppuhr läuft ab dem ersten Klick
  }

  function aufdecken(x, y) {
    if (modus === "vorbei") return;
    let i = index(feld, x, y);
    if (feld.zellen[i].offen || feld.zellen[i].fahne === 1) return;
    if (modus === "bereit") erstklick(x, y);
    i = index(feld, x, y); // feld wurde beim Erstklick ersetzt
    const zelle = feld.zellen[i];
    if (zelle.mine) {
      zelle.offen = true;
      aktualisiereZelle(i);
      verloren(i);
      return;
    }
    fluteAuf(feld, x, y).forEach(aktualisiereZelle);
    aktualisiereMinenzaehler(); // Flutung kann ?-Marker entfernt haben
    if (sieg(feld)) gewonnen();
  }

  function verloren(klickIndex) {
    modus = "vorbei";
    api.loopStopp();
    feld.zellen.forEach((zelle, i) => {
      if (zelle.mine && !zelle.offen && zelle.fahne !== 1) {
        zelle.offen = true;
        aktualisiereZelle(i); // alle Minen zeigen (richtige Fahnen bleiben stehen)
      } else if (!zelle.mine && zelle.fahne === 1) {
        const k = knoepfe[i];
        k.textContent = "✗";
        k.classList.add("mf-falsch");
        k.setAttribute("aria-label", `${posText(i)}: Fahne war falsch`);
      }
    });
    const boomKnopf = knoepfe[klickIndex];
    boomKnopf.textContent = "💥";
    boomKnopf.classList.add("mf-boom");
    if (!api.reduzierteBewegung) boomKnopf.classList.add("mf-anim"); // sonst nur Symbol + Text
    boomKnopf.setAttribute("aria-label", `${posText(klickIndex)}: Mine ausgelöst`);
    const s = Math.floor(zeit);
    status.textContent = `✗ Boom — das war eine Mine (nach ${s} s).`;
    api.zeigePanel(`
      <h2>✗ Verloren</h2>
      <p>Nach <b>${s} s</b> eine Mine erwischt. Alle Minen sind jetzt sichtbar — schau in Ruhe nach, wo es gehakt hat, und versuch's gleich nochmal.</p>
      <div class="sp-panel-knoepfe"><button type="button" class="knopf" id="mf-nochmal">Nochmal</button></div>`);
    const knopf = document.getElementById("mf-nochmal");
    knopf.addEventListener("click", () => { api.versteckePanel(); reset(); });
    knopf.focus();
  }

  function gewonnen() {
    modus = "vorbei";
    api.loopStopp(); // Zeit stoppt
    const sekunden = Math.max(1, Math.round(zeit));
    feld.zellen.forEach((zelle, i) => { // restliche Minen automatisch markieren (kosmetisch)
      if (zelle.mine && zelle.fahne !== 1) { zelle.fahne = 1; aktualisiereZelle(i); }
    });
    aktualisiereMinenzaehler();
    api.setzeZeit(`${sekunden} s`);
    api.setzePunkte(sekunden);
    status.textContent = `✓ Gewonnen in ${sekunden} s — alle sicheren Felder offen!`;
    if (stufe.bestenliste) {
      api.vorbei(sekunden, `<p>✓ <b>Gewonnen!</b> Alle sicheren Felder in ${sekunden} s aufgedeckt (${stufe.name}, ${stufe.breite}×${stufe.hoehe}).</p>`);
    } else {
      api.zeigePanel(`
        <h2>✓ Gewonnen!</h2>
        <p>Alle sicheren Felder in <b>${sekunden} s</b> aufgedeckt (${stufe.name}, ${stufe.breite}×${stufe.hoehe}).</p>
        <p>Die Bestenliste gibt es nur für die Größe Klein (9×9) — so bleiben die Zeiten vergleichbar.</p>
        <div class="sp-panel-knoepfe"><button type="button" class="knopf" id="mf-nochmal">Nochmal</button></div>`);
      const knopf = document.getElementById("mf-nochmal");
      knopf.addEventListener("click", () => { api.versteckePanel(); reset(); });
      knopf.focus();
    }
  }

  // --- Eingaben: Klick deckt auf; Rechtsklick, Long-Press (450 ms) oder Taste F setzt die Fahne ---
  function fahne(i) {
    if (modus === "vorbei") return;
    const zelle = feld.zellen[i];
    if (zelle.offen) return;
    zelle.fahne = fahneWeiter(zelle.fahne);
    aktualisiereZelle(i);
    aktualisiereMinenzaehler();
  }

  const zellKnopf = ev => (ev.target && ev.target.closest) ? ev.target.closest("button.mf-zelle") : null;
  let lpTimer = 0;
  let lpStart = null;          // { x, y, i } des laufenden Fingerdrucks
  let lpGefeuert = false;      // Long-Press hat in dieser Geste bereits geschaltet
  let lpSperreZeit = -1e9;     // Zeitstempel der letzten Long-Press-Fahne
  let lpZuletzt = { i: -1, t: -1e9 };

  gitter.addEventListener("click", ev => {
    const k = zellKnopf(ev);
    if (!k) return;
    if (performance.now() - lpSperreZeit < 600) return; // Klick direkt nach Long-Press schlucken
    const i = Number(k.dataset.i);
    aufdecken(i % feld.breite, Math.floor(i / feld.breite));
  });

  gitter.addEventListener("contextmenu", ev => {
    const k = zellKnopf(ev);
    if (!k) return;
    ev.preventDefault();
    const i = Number(k.dataset.i);
    // Android feuert nach dem Long-Press zusätzlich contextmenu — nicht doppelt schalten
    if (i === lpZuletzt.i && performance.now() - lpZuletzt.t < 800) return;
    fahne(i);
  });

  gitter.addEventListener("pointerdown", ev => {
    const k = zellKnopf(ev);
    if (!k) return;
    lpGefeuert = false;
    lpStart = { x: ev.clientX, y: ev.clientY, i: Number(k.dataset.i) };
    clearTimeout(lpTimer);
    lpTimer = setTimeout(() => {
      if (!lpStart) return;
      fahne(lpStart.i);
      lpGefeuert = true;
      lpSperreZeit = performance.now();
      lpZuletzt = { i: lpStart.i, t: lpSperreZeit };
    }, LONGPRESS_MS);
  });
  gitter.addEventListener("pointermove", ev => {
    if (lpStart && Math.hypot(ev.clientX - lpStart.x, ev.clientY - lpStart.y) > 10) {
      clearTimeout(lpTimer); // Finger zieht (z. B. Scrollen) → kein Long-Press
      lpStart = null;
    }
  });
  for (const typ of ["pointerup", "pointercancel", "pointerleave"]) {
    gitter.addEventListener(typ, () => {
      clearTimeout(lpTimer);
      lpStart = null;
      if (lpGefeuert) { // auch bei sehr langem Halten: den nachfolgenden Klick sicher schlucken
        lpGefeuert = false;
        lpSperreZeit = performance.now();
        lpZuletzt.t = lpSperreZeit;
      }
    });
  }

  gitter.addEventListener("keydown", ev => {
    if (ev.key !== "f" && ev.key !== "F") return;
    const k = zellKnopf(ev);
    if (!k) return;
    ev.preventDefault();
    fahne(Number(k.dataset.i));
  });

  innen.querySelector(".mf-wahl").addEventListener("change", ev => {
    const wert = ev.target && ev.target.value;
    if (!wert || !SCHWIERIGKEITEN[wert]) return;
    stufe = SCHWIERIGKEITEN[wert];
    reset();
  });

  reset();
}
