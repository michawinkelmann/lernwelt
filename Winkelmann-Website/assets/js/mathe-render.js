// mathe-render.js — lädt KaTeX (lokal) bei Bedarf und rendert Formeln.
// Verwendung: import { rendereMathe } from "…/mathe-render.js"; await rendereMathe(knoten);
// Nach jedem dynamischen DOM-Update erneut über die neuen Knoten laufen lassen (CLAUDE.md).

const KATEX_BASIS = new URL("../lib/katex/", import.meta.url);
let ladeVersprechen = null;

// KaTeX-CSS und -Skripte einmalig nachladen (klassische Skripte, keine ES-Module)
function ladeKatex() {
  if (ladeVersprechen) return ladeVersprechen;
  ladeVersprechen = new Promise((erfuellt, abgelehnt) => {
    if (!document.querySelector('link[data-katex]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = new URL("katex.min.css", KATEX_BASIS);
      css.dataset.katex = "1";
      document.head.append(css);
    }
    function skript(datei) {
      return new Promise((ok, fehler) => {
        const s = document.createElement("script");
        s.src = new URL(datei, KATEX_BASIS);
        s.onload = ok;
        s.onerror = () => fehler(new Error("KaTeX konnte nicht geladen werden: " + datei));
        document.head.append(s);
      });
    }
    skript("katex.min.js").then(() => skript("auto-render.min.js")).then(erfuellt, abgelehnt);
  });
  return ladeVersprechen;
}

// Rendert alle $…$ (inline) und $$…$$ (abgesetzt) im angegebenen Knoten.
export async function rendereMathe(knoten = document.body) {
  await ladeKatex();
  window.renderMathInElement(knoten, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false }
    ],
    throwOnError: false
  });
}
