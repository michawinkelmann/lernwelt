// lernzirkel.js — Stationen-/Lernzirkel-Seitentyp mit Laufzettel (localStorage).
// Eine Seite mit data-seite="lernzirkel" data-zirkel="<id>" lädt daten/lernzirkel/<id>.json
// und zeigt frei wählbare Stationen (Widget / Knobeln / Aufgaben / Simulationslink) + Häkchen.
import { WURZEL } from "../komponenten.js";
import { rendereMathe } from "../mathe-render.js";
import { baueAufgabe } from "../aufgaben-engine.js";

const KEY = "lernwelt-lernzirkel";
function lade() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_e) { return {}; } }
function speichere(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (_e) {} }
function url(rel) { return new URL(rel, WURZEL).href; }
function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function esc(t) { return String(t).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z])); }

export async function starteLernzirkel() {
  const halter = document.getElementById("lernzirkel");
  if (!halter) return;
  const id = document.body.dataset.zirkel || "";
  let z;
  try { const r = await fetch(url("daten/lernzirkel/" + id + ".json")); if (!r.ok) throw new Error(); z = await r.json(); }
  catch (_e) { halter.innerHTML = '<p class="einleitung">Dieser Lernzirkel konnte nicht geladen werden.</p>'; return; }
  const stationen = Array.isArray(z.stationen) ? z.stationen : [];
  const store = lade(); const erledigt = store[id] || {};

  halter.innerHTML = "";
  const wrap = el('<div class="lernbuero lernzirkel"></div>');
  if (z.intro) wrap.append(el(`<div class="merkkasten"><span class="merk-etikett">${esc(z.titel || "Lernzirkel")}</span><p>${z.intro}</p></div>`));
  const status = el('<p class="lz-status" role="status"></p>');
  const aktualisiere = () => { const done = stationen.filter(s => erledigt[s.id]).length; status.textContent = `Laufzettel: ${done} von ${stationen.length} Stationen erledigt.`; };
  wrap.append(status);

  // Aufgaben-Quellen vorab laden
  const quellen = [...new Set(stationen.filter(s => s.typ === "aufgaben" && s.quelle).map(s => s.quelle))];
  const AUF = new Map();
  await Promise.all(quellen.map(async q => {
    try { const r = await fetch(url("daten/aufgaben/" + q + ".json")); if (r.ok) { const li = (await r.json()).aufgaben || []; AUF.set(q, new Map(li.map(x => [x.id, x]))); } } catch (_e) {}
  }));

  for (const s of stationen) {
    const karte = el('<section class="lz-station"></section>');
    karte.append(el(`<div class="lz-station-kopf"><span class="lz-station-nr">${esc(s.nr || "")}</span><h2>${esc(s.titel || "")}</h2><span class="lz-typ">${esc(s.typLabel || s.typ || "")}</span></div>`));
    const koerper = el('<div class="lz-station-koerper"></div>');
    karte.append(koerper);
    if (s.html) koerper.append(el(`<div class="lz-text">${s.html}</div>`));
    if (s.typ === "widget" && s.widget && s.widget.id) {
      const box = el('<div class="lb-interaktiv"></div>'); koerper.append(box);
      try { const mod = await import(new URL("../interaktiv/" + s.widget.id + ".js", import.meta.url)); if (mod.mount) mod.mount(box, s.widget.params || {}); else box.innerHTML = '<p class="lb-phase-hinweis">Element nicht gefunden.</p>'; }
      catch (_e) { box.innerHTML = '<p class="lb-phase-hinweis">Element konnte nicht geladen werden.</p>'; }
    }
    if (s.typ === "aufgaben" && s.quelle) {
      const liste = el('<div class="aufgaben-liste"></div>');
      (s.ids || []).forEach((aid, i) => {
        const m = AUF.get(s.quelle); const a = m && m.get(aid);
        if (a) { const art = baueAufgabe(a, i, s.quelle); art.id = "lz-" + s.id + "-" + aid; liste.append(art); }
        else liste.append(el(`<p class="lb-luecke">Aufgabe ${esc(aid)} nicht gefunden.</p>`));
      });
      koerper.append(liste);
    }
    if (s.link && s.link.pfad) koerper.append(el(`<p><a class="knopf zweitrangig klein" href="${url(s.link.pfad)}">${esc(s.link.label || "Öffnen")} ↗</a></p>`));
    const lab = el('<label class="lz-erledigt"><input type="checkbox"> Station erledigt</label>');
    const cb = lab.querySelector("input"); cb.checked = !!erledigt[s.id];
    cb.addEventListener("change", () => { erledigt[s.id] = cb.checked; store[id] = erledigt; speichere(store); aktualisiere(); });
    karte.append(lab);
    wrap.append(karte);
  }
  aktualisiere();
  halter.append(wrap);
  await rendereMathe(wrap);
}
