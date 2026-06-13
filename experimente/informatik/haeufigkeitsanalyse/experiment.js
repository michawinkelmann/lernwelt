// experiment.js — Interaktives Experiment: Häufigkeitsanalyse (Klasse 10).
// Drei abgefangene Caesar-Geheimtexte werden wie bei echten Codeknackern
// geknackt: Buchstaben zählen, das Häufigkeitsgebirge mit der deutschen
// Referenz vergleichen, Hypothese „häufigster Buchstabe = verschlüsseltes E“
// aufstellen, k selbst rechnen — und den Beweis durch LESEN antreten.
// Text 3 ist absichtlich kurz: Dort wackelt die Statistik (eingebaute Falle).

import { bauePhasen, esc, komma, parseDezimal, csvHerunterladen, farbe } from "../../../assets/js/experiment/helfer.js";

// ---------- Alphabet & Caesar (rein, Node-testbar) ----------
export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Verschiebt nur A–Z; Leerzeichen und Satzzeichen bleiben unverändert.
export function caesar(text, k) {
  const s = ((k % 26) + 26) % 26;
  let aus = "";
  for (const z of text) {
    const i = ALPHABET.indexOf(z);
    aus += i < 0 ? z : ALPHABET[(i + s) % 26];
  }
  return aus;
}
// Entschlüsseln = Rückverschiebung um k
export function entschluessele(text, k) {
  return caesar(text, 26 - (((k % 26) + 26) % 26));
}

// Buchstaben zählen → Array mit 26 Zahlen (Index 0 = A)
export function zaehle(text) {
  const z = new Array(26).fill(0);
  for (const c of text) { const i = ALPHABET.indexOf(c); if (i >= 0) z[i]++; }
  return z;
}
export function buchstabenGesamt(text) {
  return zaehle(text).reduce((a, b) => a + b, 0);
}
// Verteilung in A–Z-Reihenfolge: { buchstabe, anzahl, prozent }
export function verteilung(text) {
  const z = zaehle(text), n = z.reduce((a, b) => a + b, 0) || 1;
  return z.map((a, i) => ({ buchstabe: ALPHABET[i], anzahl: a, prozent: a / n * 100 }));
}
// die n häufigsten Buchstaben (bei Gleichstand alphabetisch — deterministisch)
export function topBuchstaben(text, n = 3) {
  return verteilung(text).slice()
    .sort((a, b) => b.anzahl - a.anzahl || a.buchstabe.localeCompare(b.buchstabe))
    .slice(0, n);
}
// ALLE Buchstaben mit Maximal-Anzahl (Gleichstände möglich — wichtig bei kurzen Texten)
export function haeufigste(text) {
  const v = verteilung(text), max = Math.max(...v.map(e => e.anzahl));
  return max > 0 ? v.filter(e => e.anzahl === max).map(e => e.buchstabe) : [];
}
export function posVon(b) { return ALPHABET.indexOf(String(b).toUpperCase()); }
// Schlüssel aus einer Hypothese „Geheimbuchstabe g steht für Klarbuchstabe":
// k = (pos(g) − pos(klar)) mod 26
export function kAusHypothese(geheim, klar) {
  const g = posVon(geheim), k = posVon(klar);
  if (g < 0 || k < 0) return NaN;
  return ((g - k) % 26 + 26) % 26;
}
// Anteil des Buchstabens E in Prozent (Mini-Statistik der Auswertung)
export function eQuote(text) {
  const n = buchstabenGesamt(text);
  return n ? zaehle(text)[4] / n * 100 : NaN;
}

// ---------- die drei Geheimtexte ----------
// Im Code liegt AUSSCHLIESSLICH das Chiffrat; verschlüsselt wurde vorab mit
// caesar(klartext, k). Die Klartexte stehen hier nur als Kommentar:
// Text 1 (k = 7):  "DER HERBST BRINGT JEDEN MORGEN NEBEL UEBER DIE FELDER. DIE
//   SONNE STEIGT ERST SPAET UEBER DIE BAEUME, DANN GLITZERT DER TAU AUF DEN
//   WIESEN. VIELE VOEGEL FLIEGEN JETZT IN DEN WARMEN SUEDEN, DENN HIER WERDEN
//   DIE TAGE KUERZER UND DIE NAECHTE LAENGER. WIR ERNTEN AEPFEL UND BIRNEN UND
//   FREUEN UNS AUF DEN ERSTEN SCHNEE."
// Text 2 (k = 19): "IN DER SCHULE LERNEN WIR, WIE COMPUTER GEHEIME NACHRICHTEN
//   VERSENDEN. JEDER BUCHSTABE WIRD DABEI VERSCHOBEN. WER DEN SCHLUESSEL KENNT,
//   LIEST DEN TEXT IN SEKUNDEN. ALLE ANDEREN SEHEN NUR ZEICHENSALAT."
// Text 3 (k = 13): "AN DER NEUEN BAHN STEHEN NEUN TANNEN. EIN MANN NENNT SIE
//   SEINE NEUN NONNEN."  — absichtlich N-lastig und kurz: Hier ist der
//   häufigste Buchstabe NICHT das verschlüsselte E (eingebaute Statistik-Falle).
export const TEXTE = [
  { nr: 1, k: 7, geheim: "KLY OLYIZA IYPUNA QLKLU TVYNLU ULILS BLILY KPL MLSKLY. KPL ZVUUL ZALPNA LYZA ZWHLA BLILY KPL IHLBTL, KHUU NSPAGLYA KLY AHB HBM KLU DPLZLU. CPLSL CVLNLS MSPLNLU QLAGA PU KLU DHYTLU ZBLKLU, KLUU OPLY DLYKLU KPL AHNL RBLYGLY BUK KPL UHLJOAL SHLUNLY. DPY LYUALU HLWMLS BUK IPYULU BUK MYLBLU BUZ HBM KLU LYZALU ZJOULL." },
  { nr: 2, k: 19, geheim: "BG WXK LVANEX EXKGXG PBK, PBX VHFINMXK ZXAXBFX GTVAKBVAMXG OXKLXGWXG. CXWXK UNVALMTUX PBKW WTUXB OXKLVAHUXG. PXK WXG LVAENXLLXE DXGGM, EBXLM WXG MXQM BG LXDNGWXG. TEEX TGWXKXG LXAXG GNK SXBVAXGLTETM." },
  { nr: 3, k: 13, geheim: "NA QRE ARHRA ONUA FGRURA ARHA GNAARA. RVA ZNAA ARAAG FVR FRVAR ARHA ABAARA." }
];

// ---------- Referenz: typische deutsche Buchstabenhäufigkeiten ----------
// Gerundete Standardwerte — gelten für LANGE deutsche Texte.
export const DEUTSCH_REFERENZ = [
  ["E", 17.4], ["N", 9.8], ["I", 7.6], ["S", 7.3], ["R", 7.0], ["A", 6.5],
  ["T", 6.2], ["D", 5.1], ["H", 4.8], ["U", 4.4], ["L", 3.4], ["C", 3.1],
  ["G", 3.0], ["M", 2.5], ["O", 2.5], ["B", 1.9], ["W", 1.9], ["F", 1.7],
  ["K", 1.2], ["Z", 1.1], ["P", 0.8], ["V", 0.7], ["J", 0.3], ["Y", 0.1],
  ["X", 0.05], ["Q", 0.02]
];
const DEUTSCH_MAP = new Map(DEUTSCH_REFERENZ);
const DEUTSCH_MAX = DEUTSCH_REFERENZ[0][1];

// ---------- Erkenntnisfragen der Auswertung ----------
const FRAGEN = [
  {
    id: "exp-f1",
    frage: "Warum ist das Caesar-Verfahren trotz 26 möglicher Schlüssel unsicher?",
    optionen: [
      "Mit 26 Schlüsseln gibt es zu viele Kombinationen zum Durchprobieren.",
      "Die Sprachmuster überleben die Verschiebung: Das Häufigkeitsgebirge wandert nur zyklisch weiter und bleibt erkennbar.",
      "Computer können geheime Schlüssel besonders gut erraten."
    ],
    richtig: 1,
    feedbackOk: "✓ Genau! Caesar verschiebt nur — die Statistik der Sprache scheint durch. (Und 26 Schlüssel sind nebenbei so wenige, dass man zur Not einfach alle durchprobiert.)",
    feedbackNein: "✗ Noch nicht ganz. Denk an dein Diagramm: Der E-Berg war nach dem Verschlüsseln immer noch da — nur an anderer Stelle. Versuch es noch einmal!"
  },
  {
    id: "exp-f2",
    frage: "Was hilft gegen die Häufigkeitsanalyse?",
    optionen: [
      "Leerzeichen und Satzzeichen vor dem Verschlüsseln entfernen.",
      "Den Text zweimal hintereinander mit Caesar verschlüsseln.",
      "Jeder Buchstabe bekommt je nach Position wechselnde Ersetzungen — zum Beispiel beim Vigenère-Verfahren mit Schlüsselwort."
    ],
    richtig: 2,
    feedbackOk: "✓ Richtig! Wenn dasselbe E mal als X, mal als K, mal als R erscheint, wird das Häufigkeitsgebirge flachgewalzt. Ausblick: Moderne Verfahren wie AES verwürfeln Nachrichten mit langen Bit-Schlüsseln so gründlich, dass gar keine Muster übrig bleiben.",
    feedbackNein: "✗ Überleg noch einmal: Zweimal Caesar ist zusammen wieder nur EIN Caesar (k₁ + k₂), und ohne Leerzeichen ändern sich die Buchstaben-Anteile kein bisschen. Welche Idee zerstört das Muster wirklich?"
  }
];

// ---------- Prüffälle / TESTS (laufen DOM-frei in Node) ----------
export const TESTS = [
  { name: "Caesar hin und zurück (alle 26 k)", ok: () => { const t = "ANGRIFF IM MORGENGRAUEN, PUNKT ACHT!"; return Array.from({ length: 26 }, (_, k) => k).every(k => caesar(caesar(t, k), 26 - k) === t); } },
  { name: "Caesar verschiebt nur A–Z, Rest bleibt", ok: () => caesar("ABC, XYZ!", 3) === "DEF, ABC!" && caesar("HALLO WELT.", 0) === "HALLO WELT." },
  { name: "Häufigkeitszählung exakt am Mini-String", ok: () => { const z = zaehle("ABBA, OTTO!"); return z[0] === 2 && z[1] === 2 && z[14] === 2 && z[19] === 2 && z.reduce((a, b) => a + b, 0) === 8 && buchstabenGesamt("ABBA, OTTO!") === 8; } },
  { name: "Text 1: häufigster Geheim-Buchstabe = E+7", ok: () => { const h = haeufigste(TEXTE[0].geheim); return h.length === 1 && h[0] === caesar("E", TEXTE[0].k) && h[0] === "L"; } },
  { name: "Text 2: häufigster Geheim-Buchstabe = E+19", ok: () => { const h = haeufigste(TEXTE[1].geheim); return h.length === 1 && h[0] === caesar("E", TEXTE[1].k) && h[0] === "X"; } },
  { name: "Text 3 (Falle): häufigster ≠ E+13, aber Top 3 trifft E- oder N-Hypothese mit k = 13", ok: () => { const h = haeufigste(TEXTE[2].geheim), top3 = topBuchstaben(TEXTE[2].geheim, 3); return h.length === 1 && h[0] !== caesar("E", 13) && top3.some(e => kAusHypothese(e.buchstabe, "E") === 13 || kAusHypothese(e.buchstabe, "N") === 13); } },
  { name: "Text 3: beide angebotenen Folge-Hypothesen liefern k = 13", ok: () => { const top3 = topBuchstaben(TEXTE[2].geheim, 3); return kAusHypothese(top3[0].buchstabe, "N") === 13 && kAusHypothese(top3[1].buchstabe, "E") === 13 && kAusHypothese(top3[0].buchstabe, "E") !== 13; } },
  { name: "k-Formel (pos-Differenz mod 26) für alle 26 k", ok: () => Array.from({ length: 26 }, (_, k) => k).every(k => kAusHypothese(caesar("E", k), "E") === k && kAusHypothese(caesar("N", k), "N") === k) },
  { name: "Geheimtexte umlautfrei: nur A–Z, Leer- und Satzzeichen", ok: () => TEXTE.every(t => /^[A-Z .,]+$/.test(t.geheim)) },
  { name: "Soll-Längen: ~300 / ~200 / kurz (~80)", ok: () => TEXTE[0].geheim.length >= 280 && TEXTE[1].geheim.length >= 180 && TEXTE[2].geheim.length >= 60 && TEXTE[2].geheim.length <= 100 },
  { name: "Entschlüsselung: Klartext 1/2 häufigst E, Klartext 3 häufigst N vor E", ok: () => { const k1 = entschluessele(TEXTE[0].geheim, 7), k2 = entschluessele(TEXTE[1].geheim, 19), k3 = entschluessele(TEXTE[2].geheim, 13), t3 = topBuchstaben(k3, 2); return haeufigste(k1)[0] === "E" && haeufigste(k2)[0] === "E" && t3[0].buchstabe === "N" && t3[1].buchstabe === "E"; } },
  { name: "topBuchstaben sortiert absteigend, Prozente summieren zu 100", ok: () => { const v = topBuchstaben(TEXTE[0].geheim, 26); return v.every((e, i) => i === 0 || v[i - 1].anzahl >= e.anzahl) && Math.abs(v.reduce((a, e) => a + e.prozent, 0) - 100) < 1e-9; } },
  { name: "eQuote exakt und Referenz beginnt mit E = 17,4", ok: () => Math.abs(eQuote("EEN AB") - 40) < 1e-9 && DEUTSCH_REFERENZ[0][0] === "E" && DEUTSCH_REFERENZ[0][1] === 17.4 }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  const zustand = {
    textIdx: 0,
    refOffen: false,        // Referenz-Details auf-/zugeklappt
    refImDiagramm: false,   // Referenzstriche im Diagramm
    testerK: 0,             // aktuelle Einstellung des Verschiebungs-Testers
    fortschritt: TEXTE.map(() => ({
      abgelesen: null,      // korrekt abgelesener häufigster Geheim-Buchstabe
      hyp: null,            // aktuelle Hypothese { g, klar }
      kBestaetigt: null,    // korrekt berechnetes k zur aktuellen Hypothese
      versuche: [],         // { textNr, g, klar, k, geknackt }
      geknackt: false, finalK: null
    })),
    fragen: [null, null]    // Auswertung: { wahl, ok } je Erkenntnisfrage
  };

  wurzel.innerHTML = "";
  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "durchfuehrung", label: "Durchführung" },
    { id: "auswertung", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = `
    <div class="exp-links">
      <canvas id="exp-canvas" width="360" height="640" aria-label="Balkendiagramm: Häufigkeit der Buchstaben A bis Z im gewählten Geheimtext in Prozent, jeder Balken mit Wert beschriftet."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);
  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  const aktText = () => TEXTE[zustand.textIdx];
  const aktF = () => zustand.fortschritt[zustand.textIdx];
  const alleGeknackt = () => zustand.fortschritt.every(f => f.geknackt);

  // ---------- Balkendiagramm (Werkzeug 1) ----------
  function zeichneDiagramm() {
    const t = aktText(), v = verteilung(t.geheim);
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillStyle = cText;
    ctx.fillText("Geheimtext " + t.nr + ": Buchstabenhäufigkeit in %", 10, 18);
    ctx.font = "12px system-ui, sans-serif";
    if (zustand.refImDiagramm) {
      ctx.fillStyle = cLeise;
      ctx.fillText("senkrechte Striche = typisch Deutsch (lange Texte)", 10, 36);
    }
    const oben = 46, zeilenH = 22, x0 = 30, breite = W - x0 - 56;
    const maxP = Math.max(1, ...v.map(e => e.prozent), zustand.refImDiagramm ? DEUTSCH_MAX : 0) * 1.05;
    v.forEach((e, i) => {
      const y = oben + i * zeilenH;
      ctx.fillStyle = cText;
      ctx.fillText(e.buchstabe, 10, y + 13);
      const bw = e.prozent / maxP * breite;
      ctx.fillStyle = cAkzent;
      ctx.fillRect(x0, y + 2, e.anzahl ? Math.max(bw, 2) : 0, 14);
      ctx.fillStyle = cText;
      ctx.fillText(komma(e.prozent, 1), x0 + bw + 6, y + 13);
      if (zustand.refImDiagramm) {
        const rx = x0 + (DEUTSCH_MAP.get(e.buchstabe) || 0) / maxP * breite;
        ctx.strokeStyle = cLeise; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx, y + 18); ctx.stroke();
      }
    });
  }

  // ---------- gemeinsame HTML-Bausteine ----------
  const textBox = inhalt => `<pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:0.95em;line-height:1.5;border:1.5px solid var(--linie);border-radius:8px;padding:8px 10px;background:var(--flaeche);max-height:9.5em;overflow:auto;">${esc(inhalt)}</pre>`;

  function referenzHtml() {
    return `<details id="exp-referenz"${zustand.refOffen ? " open" : ""}>
      <summary>Referenz: typische deutsche Buchstabenhäufigkeiten (Werkzeug 2)</summary>
      <p>Gerundete Standardwerte — typisch für <strong>lange</strong> deutsche Texte:</p>
      <p>${DEUTSCH_REFERENZ.map(([b, p]) => `<strong>${b}</strong> ${komma(p, p < 0.1 ? 2 : 1)} %`).join(" · ")}</p>
      <p><label><input type="checkbox" id="exp-ref-an"${zustand.refImDiagramm ? " checked" : ""}> Referenzwerte als Striche im Diagramm einblenden</label></p>
    </details>`;
  }

  function protokollHtml() {
    const zeilen = zustand.fortschritt.flatMap(f => f.versuche);
    return `<table class="exp-tabelle"><thead><tr><th>Text</th><th>häufigster Buchstabe</th><th>Hypothese</th><th>vermutetes k</th><th>geknackt</th></tr></thead>
      <tbody>${zeilen.map(v => `<tr><td>${v.textNr}</td><td>${esc(zustand.fortschritt[v.textNr - 1].abgelesen || "?")}</td><td>${esc(v.g + " = " + v.klar)}</td><td>${v.k}</td><td>${v.geknackt ? "✓ ja" : "✗ nein"}</td></tr>`).join("") || '<tr><td colspan="5">noch leer</td></tr>'}</tbody></table>`;
  }

  function zeigePhase(id) {
    if (id === "aufbau") panelAufbau();
    if (id === "durchfuehrung") panelDurchfuehrung();
    if (id === "auswertung") panelAuswertung();
  }

  // ---------- Phase 1: Aufbau ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Auftrag und Werkzeuge</h2>
      <p>Drei Nachrichten wurden abgefangen — alle mit dem <strong>Caesar-Verfahren</strong> verschlüsselt: Jeder Buchstabe ist im Alphabet um <em>k</em> Stellen weitergeschoben, Leer- und Satzzeichen blieben stehen. Den Schlüssel kennt niemand. Dein Auftrag: <strong>alle drei Texte knacken</strong> — ganz ohne Raten.</p>
      <p>Dein Werkzeugkasten:</p>
      <ul>
        <li><strong>Häufigkeitsdiagramm</strong> (links): zählt für den gewählten Geheimtext, wie oft jeder Buchstabe von A bis Z vorkommt.</li>
        <li><strong>Referenztabelle</strong>: typische Buchstabenhäufigkeiten langer deutscher Texte — E liegt mit 17,4 % weit vorn.</li>
        <li><strong>Verschiebungs-Tester</strong>: entschlüsselt den Textanfang live mit einem k deiner Wahl.</li>
      </ul>
      <p><strong>Plan für jeden Text:</strong> häufigsten Geheim-Buchstaben ablesen → Hypothese „das ist das verschlüsselte E“ → daraus k berechnen → Tester einstellen und den Beweis durch <em>Lesen</em> antreten.</p>
      <p class="exp-hinweis">Echte Codeknacker brauchen Geduld: Nicht jede Hypothese sitzt beim ersten Versuch — genau das gehört zum Experiment. Starte mit Text 1: Je länger der Text, desto verlässlicher die Statistik.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("durchfuehrung"));
  }

  // ---------- Phase 2: Durchführung ----------
  function hypotheseUndTesterHtml(t, f) {
    let s = `<h3>Schritt 2 · Hypothese und Schlüssel</h3>
      <p>Hypothese: <strong>${esc(f.hyp.g)}</strong> ist das verschlüsselte <strong>${esc(f.hyp.klar)}</strong>.</p>`;
    if (f.kBestaetigt === null) {
      s += `<p>Berechne selbst: k = (Position(${esc(f.hyp.g)}) − Position(${esc(f.hyp.klar)})) mod 26. Wird die Differenz negativ, addiere 26.</p>
      <details><summary>Positionsnummern A–Z</summary><p>${ALPHABET.split("").map((b, i) => b + "=" + i).join(" · ")}</p></details>
      <form id="exp-kform" class="exp-ablesen">
        <label for="exp-k">k =</label>
        <input id="exp-k" inputmode="numeric" size="4" autocomplete="off">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-m2" class="exp-meldung" aria-live="polite"></p>`;
    } else {
      s += `<p>✓ Richtig gerechnet: k = <strong>${f.kBestaetigt}</strong>.</p>
      <h3>Schritt 3 · Beweis durch Lesen (Werkzeug 3)</h3>
      <div class="exp-regler">
        <label for="exp-kslider">Verschiebungs-Tester — entschlüsselt mit k = <span id="exp-kwert">${zustand.testerK}</span></label>
        <input type="range" id="exp-kslider" min="0" max="25" step="1" value="${zustand.testerK}">
      </div>
      <p class="exp-ablesen"><label for="exp-kzahl">k direkt eingeben:</label> <input id="exp-kzahl" class="exp-eingabe" inputmode="numeric" size="3" value="${zustand.testerK}">
      <button class="knopf zweitrangig" id="exp-kspringen" type="button">Tester auf k = ${f.kBestaetigt} stellen</button></p>
      <p>Anfang des Textes mit diesem k:</p>
      <pre id="exp-tester" style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:0.95em;border:1.5px solid var(--linie);border-radius:8px;padding:8px 10px;background:var(--flaeche);">${esc(entschluessele(t.geheim, zustand.testerK).slice(0, 60))} …</pre>
      <p><strong>Schau genau hin: Ist das lesbares Deutsch?</strong> (Der Beweis kommt vom Lesen, nicht vom Diagramm.)</p>
      <div class="exp-knopfzeile">
        <button class="knopf" id="exp-lesbar-ja">Ja, lesbar — Hypothese bestätigt</button>
        <button class="knopf zweitrangig" id="exp-lesbar-nein">Nein, Kauderwelsch</button>
      </div>
      <p id="exp-m3" class="exp-meldung" aria-live="polite"></p>`;
    }
    return s;
  }

  function panelDurchfuehrung() {
    const t = aktText(), f = aktF();
    const top3 = topBuchstaben(t.geheim, 3);
    let schritte = "";
    if (!f.abgelesen) {
      schritte = `<h3>Schritt 1 · Ablesen</h3>
        <p>Schau ins Diagramm links: Welcher Buchstabe kommt in diesem Geheimtext am häufigsten vor?</p>
        <form id="exp-ablesen" class="exp-ablesen">
          <label for="exp-buchstabe">Häufigster Buchstabe:</label>
          <input id="exp-buchstabe" maxlength="1" size="3" autocomplete="off" autocapitalize="characters">
          <button class="knopf">Prüfen</button>
        </form>
        <p id="exp-m1" class="exp-meldung" aria-live="polite"></p>`;
    } else if (!f.geknackt) {
      schritte = `<h3>Schritt 1 · Ablesen</h3>
        <p>✓ Häufigster Buchstabe: <strong>${esc(f.abgelesen)}</strong>${t.nr === 3 ? ` — Top 3: ${top3.map(e => `${e.buchstabe} (${e.anzahl}×)`).join(", ")}. Nur ${buchstabenGesamt(t.geheim)} Buchstaben — so eine kurze Stichprobe kann täuschen!` : ""}</p>`;
      if (!f.hyp) {
        const optionen = [
          { g: top3[1].buchstabe, klar: "E", text: `Der zweithäufigste Buchstabe ${top3[1].buchstabe} steht für E (E bleibt Favorit).` },
          { g: f.abgelesen, klar: "N", text: `Der häufigste Buchstabe ${f.abgelesen} steht für N (Platz 2 im Deutschen).` }
        ];
        const probiert = o => f.versuche.some(v => v.g === o.g && v.klar === o.klar);
        schritte += `<h3>Schritt 2 · Neue Hypothese wählen</h3>
          <p class="exp-hinweis">Kauderwelsch — die erste Hypothese ist verworfen. <strong>Kurze Texte = wacklige Statistik.</strong> Probiere die nächste Hypothese!</p>
          <fieldset><legend>Welche Hypothese probierst du als Nächstes?</legend>
          ${optionen.map((o, i) => `<p><label><input type="radio" name="exp-hyp" value="${i}" data-g="${o.g}" data-klar="${o.klar}"${probiert(o) ? " disabled" : ""}> ${esc(o.text)}${probiert(o) ? " (schon probiert)" : ""}</label></p>`).join("")}
          </fieldset>`;
      } else {
        schritte += hypotheseUndTesterHtml(t, f);
      }
    } else {
      schritte = `<h3>✓ Geknackt: k = ${f.finalK}</h3>
        <p>Der Klartext:</p>
        ${textBox(entschluessele(t.geheim, t.k))}
        <p>Stark! Nimm dir oben den nächsten Text vor — oder geh zur Auswertung, wenn alle drei geknackt sind.</p>`;
    }
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <label for="exp-textwahl"><strong>Geheimtext wählen:</strong></label>
      <select id="exp-textwahl" class="exp-wahl">
        ${TEXTE.map((tx, i) => `<option value="${i}">Text ${tx.nr} — ${tx.geheim.length} Zeichen${zustand.fortschritt[i].geknackt ? " · ✓ geknackt" : ""}</option>`).join("")}
      </select>
      ${textBox(t.geheim)}
      ${referenzHtml()}
      ${schritte}
      <h3>Protokoll</h3>
      ${protokollHtml()}
      <p>${zustand.fortschritt.filter(x => x.geknackt).length} von 3 Texten geknackt.</p>
      <button class="knopf" id="exp-weiter2"${alleGeknackt() ? "" : " disabled"}>Zur Auswertung</button>`;

    // --- Verdrahtung ---
    const wahl = panel.querySelector("#exp-textwahl");
    wahl.value = String(zustand.textIdx);
    wahl.addEventListener("change", () => {
      zustand.textIdx = Number(wahl.value);
      zustand.testerK = 0;
      zeichneDiagramm(); panelDurchfuehrung();
    });
    const ref = panel.querySelector("#exp-referenz");
    ref.addEventListener("toggle", () => { zustand.refOffen = ref.open; });
    panel.querySelector("#exp-ref-an").addEventListener("change", ev => {
      zustand.refImDiagramm = ev.target.checked; zeichneDiagramm();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswertung"));

    // Schritt 1: häufigsten Buchstaben ablesen (exakt; Gleichstände werden akzeptiert)
    panel.querySelector("#exp-ablesen")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const m = panel.querySelector("#exp-m1");
      const eingabe = String(panel.querySelector("#exp-buchstabe").value).trim().toUpperCase();
      if (!/^[A-Z]$/.test(eingabe)) { m.textContent = "Bitte genau einen Buchstaben von A bis Z eingeben."; return; }
      if (!haeufigste(t.geheim).includes(eingabe)) {
        m.textContent = "✗ Vergleiche die Balkenlängen noch einmal in Ruhe: Welcher Balken ist wirklich am längsten?";
        return;
      }
      f.abgelesen = eingabe;
      f.hyp = { g: eingabe, klar: "E" }; // Standard-Hypothese der Codeknacker
      panelDurchfuehrung();
    });

    // Schritt 2: neue Hypothese wählen (nur nach Fehlversuch sichtbar)
    panel.querySelectorAll('input[name="exp-hyp"]').forEach(r => r.addEventListener("change", () => {
      f.hyp = { g: r.dataset.g, klar: r.dataset.klar };
      f.kBestaetigt = null;
      panelDurchfuehrung();
    }));

    // Schritt 2: k berechnen (Toleranz 0)
    panel.querySelector("#exp-kform")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const m = panel.querySelector("#exp-m2");
      const eingabe = parseDezimal(panel.querySelector("#exp-k").value);
      if (!Number.isInteger(eingabe) || eingabe < 0 || eingabe > 25) { m.textContent = "k ist eine ganze Zahl zwischen 0 und 25."; return; }
      const soll = kAusHypothese(f.hyp.g, f.hyp.klar);
      if (eingabe !== soll) {
        m.textContent = `✗ Rechne noch einmal: Position(${f.hyp.g}) = ${posVon(f.hyp.g)}, Position(${f.hyp.klar}) = ${posVon(f.hyp.klar)} — Differenz bilden, bei negativem Ergebnis 26 addieren.`;
        return;
      }
      f.kBestaetigt = soll;
      panelDurchfuehrung();
    });

    // Schritt 3: Verschiebungs-Tester + Urteil
    function testerAktualisieren() {
      const aus = panel.querySelector("#exp-tester");
      if (aus) aus.textContent = entschluessele(t.geheim, zustand.testerK).slice(0, 60) + " …";
      const w = panel.querySelector("#exp-kwert"); if (w) w.textContent = String(zustand.testerK);
      const s = panel.querySelector("#exp-kslider"); if (s) s.value = String(zustand.testerK);
      const z = panel.querySelector("#exp-kzahl"); if (z && z !== document.activeElement) z.value = String(zustand.testerK);
    }
    panel.querySelector("#exp-kslider")?.addEventListener("input", ev => {
      zustand.testerK = Number(ev.target.value); testerAktualisieren();
    });
    panel.querySelector("#exp-kzahl")?.addEventListener("change", ev => {
      const n = parseDezimal(ev.target.value);
      if (Number.isInteger(n) && n >= 0 && n <= 25) zustand.testerK = n;
      testerAktualisieren();
    });
    panel.querySelector("#exp-kspringen")?.addEventListener("click", () => {
      zustand.testerK = f.kBestaetigt; testerAktualisieren();
    });
    function urteil(lesbarGesagt) {
      const m = panel.querySelector("#exp-m3");
      if (zustand.testerK !== f.kBestaetigt) { m.textContent = `Stell den Tester zuerst auf dein berechnetes k = ${f.kBestaetigt}.`; return; }
      const stimmt = f.kBestaetigt === t.k;
      if (lesbarGesagt && !stimmt) { m.textContent = "✗ Wirklich? Lies laut — das sind keine deutschen Wörter. Bleib ehrlich bei dem, was dasteht!"; return; }
      if (!lesbarGesagt && stimmt) { m.textContent = "Schau noch einmal hin: Da stehen echte deutsche Wörter!"; return; }
      f.versuche.push({ textNr: t.nr, g: f.hyp.g, klar: f.hyp.klar, k: f.kBestaetigt, geknackt: stimmt });
      if (stimmt) {
        f.geknackt = true; f.finalK = f.kBestaetigt;
      } else {
        f.hyp = null; f.kBestaetigt = null; // → Schritt 2 bietet neue Hypothesen an
      }
      panelDurchfuehrung();
    }
    panel.querySelector("#exp-lesbar-ja")?.addEventListener("click", () => urteil(true));
    panel.querySelector("#exp-lesbar-nein")?.addEventListener("click", () => urteil(false));
  }

  // ---------- Phase 3: Auswertung ----------
  function frageHtml(fr, i) {
    const st = zustand.fragen[i];
    return `<fieldset><legend>${esc(fr.frage)}</legend>
      ${fr.optionen.map((o, j) => `<p><label><input type="radio" name="${fr.id}" value="${j}"${st && st.wahl === j ? " checked" : ""}> ${esc(o)}</label></p>`).join("")}
      <button class="knopf zweitrangig" data-frage="${i}" type="button">Antwort prüfen</button>
      <p class="exp-meldung" id="${fr.id}-m" aria-live="polite">${st ? esc(st.ok ? fr.feedbackOk : fr.feedbackNein) : ""}</p>
    </fieldset>`;
  }

  function panelAuswertung() {
    const offen = zustand.fortschritt.filter(f => !f.geknackt).length;
    const statZeilen = TEXTE.map(t => {
      const klar = entschluessele(t.geheim, t.k);
      return { nr: t.nr, n: buchstabenGesamt(klar), q: eQuote(klar) };
    });
    const klar3 = entschluessele(TEXTE[2].geheim, TEXTE[2].k);
    const nQuote3 = verteilung(klar3)[posVon("N")].prozent;
    panel.innerHTML = `
      <h2>Auswertung</h2>
      ${offen ? `<p class="exp-hinweis">Noch ${offen} Text${offen > 1 ? "e" : ""} ungeknackt — du kannst trotzdem schon auswerten und später weitermachen.</p>` : ""}
      <h3>Dein Protokoll</h3>
      ${protokollHtml()}
      <p><button class="knopf zweitrangig" id="exp-csv" type="button">Tabelle als CSV speichern</button></p>
      <h3>Erkenntnisfragen</h3>
      ${FRAGEN.map((fr, i) => frageHtml(fr, i)).join("")}
      <h3>Mini-Statistik: Wie „typisch deutsch“ waren unsere Klartexte?</h3>
      <table class="exp-tabelle"><thead><tr><th>Text</th><th>Buchstaben</th><th>E-Anteil</th><th>Referenz</th><th>Abweichung</th></tr></thead>
      <tbody>${statZeilen.map(r => `<tr><td>${r.nr}</td><td>${r.n}</td><td>${komma(r.q, 1)} %</td><td>17,4 %</td><td>${r.q - 17.4 >= 0 ? "+" : "−"}${komma(Math.abs(r.q - 17.4), 1)} %</td></tr>`).join("")}</tbody></table>
      <p>Text 3 fällt aus der Reihe: Sein häufigster Buchstabe ist gar nicht E, sondern N (${komma(nQuote3, 1)} % statt typisch 9,8 %) — bei nur ${buchstabenGesamt(klar3)} Buchstaben kann ein einziges Wortfeld die ganze Statistik kippen.</p>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — wo die Statistik an Grenzen stößt</summary>
        <ul>
          <li><strong>Textlänge:</strong> Die 17,4 % für E gelten für lange Texte. Je kürzer der Text, desto wackliger die Rangfolge — Text 3 hat es dir vorgeführt.</li>
          <li><strong>Wortschatz:</strong> Fachwörter, Namen und einseitige Themen verzerren die Zählung — ein Text voller „Tannen“ und „Nonnen“ hat zu viele N.</li>
          <li><strong>Trotzdem stark:</strong> Caesar zerstört das Häufigkeitsgebirge nie — er verschiebt es nur zyklisch. Genau deshalb funktioniert die Methode, und mit mehr Text wird sie immer treffsicherer.</li>
        </ul>
      </details>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-zurueck" type="button">Zurück zur Durchführung</button>
        <button class="knopf" id="exp-neustart" type="button">Neues Experiment</button>
      </div>`;
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const zeilen = zustand.fortschritt.flatMap(f => f.versuche)
        .map(v => ["Text " + v.textNr, zustand.fortschritt[v.textNr - 1].abgelesen || "?", v.g + " = " + v.klar, String(v.k), v.geknackt ? "ja" : "nein"]);
      csvHerunterladen("haeufigkeitsanalyse-protokoll.csv",
        ["Text", "Haeufigster Buchstabe", "Hypothese", "Vermutetes k", "Geknackt"], zeilen);
    });
    panel.querySelectorAll("[data-frage]").forEach(b => b.addEventListener("click", () => {
      const i = Number(b.dataset.frage), fr = FRAGEN[i];
      const gewaehlt = panel.querySelector(`input[name="${fr.id}"]:checked`);
      const m = panel.querySelector("#" + fr.id + "-m");
      if (!gewaehlt) { m.textContent = "Wähle zuerst eine Antwort aus."; return; }
      const ok = Number(gewaehlt.value) === fr.richtig;
      zustand.fragen[i] = { wahl: Number(gewaehlt.value), ok };
      m.textContent = ok ? fr.feedbackOk : fr.feedbackNein;
    }));
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("durchfuehrung"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.textIdx = 0; zustand.testerK = 0; zustand.refOffen = false; zustand.refImDiagramm = false;
      zustand.fortschritt = TEXTE.map(() => ({ abgelesen: null, hyp: null, kBestaetigt: null, versuche: [], geknackt: false, finalK: null }));
      zustand.fragen = [null, null];
      zeichneDiagramm(); wechslePhase("aufbau");
    });
  }

  zeichneDiagramm();
  wechslePhase("aufbau");
}
