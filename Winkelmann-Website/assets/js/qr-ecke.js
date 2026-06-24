// qr-ecke.js — kompakter QR-Code oben rechts auf Unterseiten, verlinkt auf das AKTUELLE VERZEICHNIS
// (analog zum QR auf der Startseite, der auf die Hauptseite zeigt). Nutzt ausschließlich die lokale
// Bibliothek assets/lib/qr/qrcode.js — keine externen Requests. Heller, dezent fachfarbig getönter
// Hintergrund (statt Weiß); dunkle Module bleiben für sichere Scanbarkeit erhalten.

import { WURZEL } from "./komponenten.js";

let libVersprechen = null;
function ladeLib() {
  if (window.qrcode) return Promise.resolve();
  if (libVersprechen) return libVersprechen;
  libVersprechen = new Promise((aufloesen, ablehnen) => {
    const s = document.createElement("script");
    s.src = new URL("assets/lib/qr/qrcode.js", WURZEL).href;
    s.onload = aufloesen;
    s.onerror = ablehnen;
    document.head.appendChild(s);
  });
  return libVersprechen;
}

// Erzeugt ein Inline-SVG des QR-Codes für den Text. Helle Fläche = Boxhintergrund (CSS-Variable),
// dunkle Module als ein Pfad aus horizontalen Läufen (wenige Knoten). Ruhezone (quiet zone) = 4 Module.
function qrSvg(text) {
  const q = window.qrcode(0, "M");        // Version automatisch, Fehlerkorrektur M (wie Startseite)
  q.addData(text);                        // Standardmodus 8-Bit (Byte) — passt für ganze URLs
  q.make();
  const n = q.getModuleCount();
  const qz = 4, D = n + 2 * qz;
  let d = "";
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (q.isDark(r, c)) {
        let w = 1;
        while (c + w < n && q.isDark(r, c + w)) w++;
        d += `M${c + qz} ${r + qz}h${w}v1h-${w}z`;
        c += w;
      } else c++;
    }
  }
  return `<svg viewBox="0 0 ${D} ${D}" role="img" aria-label="QR-Code zu dieser Seite" `
    + `xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">`
    + `<rect width="${D}" height="${D}" fill="var(--qr-bg)"/>`
    + `<path d="${d}" fill="var(--qr-mod)"/></svg>`;
}

export async function zeigeQrEcke() {
  try {
    const ziel = document.querySelector("main#inhalt") || document.querySelector(".inhalt") || document.querySelector("main");
    if (!ziel || ziel.querySelector(".qr-ecke")) return;     // kein Ziel oder schon vorhanden
    await ladeLib();
    if (!window.qrcode) return;
    const url = new URL(".", location.href).href;            // aktuelles Verzeichnis (ohne Datei/Hash)
    const fig = document.createElement("figure");
    fig.className = "qr-ecke";
    fig.innerHTML = `<a href="${url}" aria-label="Diese Seite öffnen">${qrSvg(url)}</a>`
      + `<figcaption>Seite scannen</figcaption>`;
    if (getComputedStyle(ziel).position === "static") ziel.style.position = "relative";
    ziel.insertBefore(fig, ziel.firstChild);
  } catch (_e) { /* QR ist optionales Beiwerk — niemals die Seite brechen lassen */ }
}
