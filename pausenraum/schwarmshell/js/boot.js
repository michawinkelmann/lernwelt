// boot.js — lädt als allererstes Script und stellt einen minimalen Fehler-Reporter
// bereit. Wenn beim Laden der Daten-/Logik-Scripts etwas schiefgeht (kaputte Datei,
// falsche Reihenfolge in index.html), sehen Spieler*innen sonst nur eine leere Seite
// — Fehler landen ausschließlich in der DevTools-Konsole, die Schüler*innen und
// Lehrkräfte i.d.R. nicht offen haben.
//
// Bewusst ohne Abhängigkeiten (kein core.js, kein CSS nötig): muss auch dann
// funktionieren, wenn alles andere kaputt ist.
function schwarmBootError(detail){
  try{
    console.error("[SchwarmShell] Boot-Fehler:", detail);
    if(document.getElementById("bootError")) return; // nur eine Meldung anzeigen
    const div = document.createElement("div");
    div.id = "bootError";
    div.setAttribute("role", "alert");
    div.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#5c1a1a;color:#ffe7e7;font:14px/1.5 system-ui,sans-serif;padding:12px 16px;border-bottom:2px solid #a33;";
    div.textContent = "⚠️ SchwarmShell konnte nicht starten: " + detail +
      " — Bitte die Seite über einen lokalen Webserver öffnen und die <script>-Reihenfolge in index.html prüfen.";
    const attach = ()=>{ try{ document.body.prepend(div); }catch(_e){} };
    if(document.body) attach();
    else document.addEventListener("DOMContentLoaded", attach);
  }catch(_e){ /* Reporter darf selbst nie werfen */ }
}
window.schwarmBootError = schwarmBootError;
