/* ============================================================
   Zeugnis-Verteidigung – Pathfinding (Mazing) v5
   BFS-Flow-Field vom Zeugnis aus + Platzierungsvalidierung.
   Unterstützt mehrere Schultore (Spawns) und feste Hindernisse.
   Pure Funktionen, auch in Node testbar.
   ============================================================ */
'use strict';

const PATH_INF = 0x7fff;

/** Index-Helfer: Zelle (x,y) -> Array-Index */
function cellIdx(x, y, cols) { return y * cols + x; }

/**
 * BFS vom Ziel (core) über alle begehbaren Zellen (4er-Nachbarschaft).
 * blocked: Uint8Array(cols*rows), 1 = Tower/Hindernis steht hier.
 * Liefert Int16Array mit Distanz in Zellen (PATH_INF = unerreichbar).
 */
function computeDist(blocked, cols, rows, core) {
  const dist = new Int16Array(cols * rows).fill(PATH_INF);
  const queue = new Int32Array(cols * rows);
  let head = 0, tail = 0;
  const start = cellIdx(core.x, core.y, cols);
  dist[start] = 0;
  queue[tail++] = start;
  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % cols, cy = (cur / cols) | 0;
    const d = dist[cur] + 1;
    if (cx > 0)        { const n = cur - 1;    if (!blocked[n] && dist[n] === PATH_INF) { dist[n] = d; queue[tail++] = n; } }
    if (cx < cols - 1) { const n = cur + 1;    if (!blocked[n] && dist[n] === PATH_INF) { dist[n] = d; queue[tail++] = n; } }
    if (cy > 0)        { const n = cur - cols; if (!blocked[n] && dist[n] === PATH_INF) { dist[n] = d; queue[tail++] = n; } }
    if (cy < rows - 1) { const n = cur + cols; if (!blocked[n] && dist[n] === PATH_INF) { dist[n] = d; queue[tail++] = n; } }
  }
  return dist;
}

/**
 * Flow-Field: für jede Zelle der Index der Nachbarzelle mit kleinster Distanz
 * (-1 = keine Richtung / unerreichbar).
 */
function computeFlow(dist, cols, rows) {
  const flow = new Int32Array(cols * rows).fill(-1);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = cellIdx(x, y, cols);
      if (dist[i] === PATH_INF || dist[i] === 0) continue;
      let best = -1, bestD = dist[i];
      if (x < cols - 1 && dist[i + 1]    < bestD) { bestD = dist[i + 1];    best = i + 1; }
      if (y < rows - 1 && dist[i + cols] < bestD) { bestD = dist[i + cols]; best = i + cols; }
      if (x > 0        && dist[i - 1]    < bestD) { bestD = dist[i - 1];    best = i - 1; }
      if (y > 0        && dist[i - cols] < bestD) { bestD = dist[i - cols]; best = i - cols; }
      flow[i] = best;
    }
  }
  return flow;
}

/**
 * Prüft, ob ein Tower auf (x,y) gebaut werden darf:
 *  - Zelle frei, kein Schultor, nicht das Zeugnis
 *  - ALLE Schultore bleiben mit dem Zeugnis verbunden
 *  - kein lebender Gegner wird eingesperrt oder steht auf der Zelle
 * spawns: Array von {x,y}; enemyCells: Zell-Indizes lebender Gegner.
 * Rückgabe: { ok, reason, dist } – dist = neues Distanzfeld bei Erfolg.
 */
function tryPlace(blocked, cols, rows, spawns, core, x, y, enemyCells) {
  if (x < 0 || y < 0 || x >= cols || y >= rows) return { ok: false, reason: 'Außerhalb des Schulhofs!' };
  const i = cellIdx(x, y, cols);
  if (blocked[i]) return { ok: false, reason: 'Hier ist kein Platz!' };
  if (x === core.x && y === core.y) return { ok: false, reason: 'Das Zeugnis muss frei bleiben!' };
  for (const s of spawns)
    if (x === s.x && y === s.y) return { ok: false, reason: 'Die Schultore müssen frei bleiben!' };
  for (let k = 0; k < enemyCells.length; k++)
    if (enemyCells[k] === i) return { ok: false, reason: 'Da steht gerade ein Gegner!' };

  blocked[i] = 1; // probeweise blockieren
  const dist = computeDist(blocked, cols, rows, core);
  for (const s of spawns) {
    if (dist[cellIdx(s.x, s.y, cols)] === PATH_INF) {
      blocked[i] = 0;
      return { ok: false, reason: 'Der Weg zum Zeugnis darf nicht komplett verbaut werden!' };
    }
  }
  for (let k = 0; k < enemyCells.length; k++) {
    if (dist[enemyCells[k]] === PATH_INF) {
      blocked[i] = 0;
      return { ok: false, reason: 'Du würdest einen Gegner einsperren!' };
    }
  }
  blocked[i] = 0; // Aufrufer setzt die Blockade endgültig
  return { ok: true, dist };
}

/** Verfolgt den Laufweg von einem Spawn zum Core (für die Pfad-Vorschau). */
function traceRoute(flow, dist, cols, spawn, core) {
  const route = [];
  let i = cellIdx(spawn.x, spawn.y, cols);
  if (dist[i] === PATH_INF) return route;
  const limit = flow.length + 1;
  let steps = 0;
  while (i !== -1 && steps++ < limit) {
    route.push({ x: i % cols, y: (i / cols) | 0 });
    if (i === cellIdx(core.x, core.y, cols)) break;
    i = flow[i];
  }
  return route;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PATH_INF, cellIdx, computeDist, computeFlow, tryPlace, traceRoute };
}
