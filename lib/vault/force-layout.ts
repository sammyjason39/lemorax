export type ForceNodeIn = {
  id: string;
  title?: string;
  x?: number;
  y?: number;
  vx: number;
  vy: number;
  linkCount: number;
};

export type ForceNode = ForceNodeIn & { x: number; y: number };

export type ForceLink = {
  source: string;
  target: string;
};

export type ForceLayoutOptions = {
  width: number;
  height: number;
  iterations?: number;
  linkDistance?: number;
  charge?: number;
  gravity?: number;
};

// Larger canvas → more room per node (35+ notes, 100+ edges)
const SIM_WIDTH = 2400;
const SIM_HEIGHT = 1700;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function labelChars(title?: string): number {
  if (!title) return 20;
  return Math.min(title.length, 34);
}

/** Collision radius includes dot + label extending to the right */
export function nodeCollisionRadius(linkCount: number, title?: string): number {
  const dotR = 4 + Math.sqrt(Math.max(linkCount, 1)) * 1.2;
  const labelW = labelChars(title) * 6.2;
  const halfW = (dotR + 6 + labelW) / 2;
  const halfH = Math.max(dotR, 8);
  return Math.sqrt(halfW * halfW + halfH * halfH) + 18;
}

function initialPosition(id: string, index: number, total: number, cx: number, cy: number, spread: number) {
  const h = hashId(id);
  const angle = ((h % 360) / 360) * Math.PI * 2 + (index / Math.max(total, 1)) * Math.PI * 0.35;
  const radius = spread * (0.55 + (h % 100) / 120);
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

type SimNode = ForceNodeIn & { x: number; y: number; vx: number; vy: number };

/** Push overlapping nodes apart until bounding circles don't intersect */
function resolveOverlaps(nodes: SimNode[], width: number, height: number, passes = 200) {
  const pad = 48;
  for (let pass = 0; pass < passes; pass++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        const minDist = nodeCollisionRadius(a.linkCount, a.title) + nodeCollisionRadius(b.linkCount, b.title);

        if (dist < minDist) {
          if (dist < 0.5) {
            const angle = ((hashId(a.id + b.id) % 360) * Math.PI) / 180;
            dx = Math.cos(angle);
            dy = Math.sin(angle);
            dist = 1;
          }
          const push = ((minDist - dist) / dist) * 0.55;
          a.x -= dx * push;
          a.y -= dy * push;
          b.x += dx * push;
          b.y += dy * push;
          moved = true;
        }
      }
    }
    for (const n of nodes) {
      n.x = Math.max(pad, Math.min(width - pad, n.x));
      n.y = Math.max(pad, Math.min(height - pad, n.y));
    }
    if (!moved && pass > 40) break;
  }
}

function centerInViewport(nodes: SimNode[], width: number, height: number, padding = 80) {
  if (nodes.length === 0) return;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const cr = nodeCollisionRadius(n.linkCount, n.title);
    minX = Math.min(minX, n.x - cr);
    maxX = Math.max(maxX, n.x + cr);
    minY = Math.min(minY, n.y - cr);
    maxY = Math.max(maxY, n.y + cr);
  }

  const bw = Math.max(maxX - minX, 1);
  const bh = Math.max(maxY - minY, 1);
  const availW = width - padding * 2;
  const availH = height - padding * 2;

  // Only shrink when graph exceeds canvas; expand up to 1.25× when clustered
  let scale = Math.min(availW / bw, availH / bh);
  scale = Math.max(0.72, Math.min(scale, 1.28));

  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  for (const n of nodes) {
    n.x = (n.x - midX) * scale + width / 2;
    n.y = (n.y - midY) * scale + height / 2;
  }
}

/** Force-directed layout with label-aware collision */
export function computeForceLayout(
  nodes: ForceNodeIn[],
  links: ForceLink[],
  opts?: Partial<ForceLayoutOptions>
): ForceNode[] {
  const width = opts?.width ?? SIM_WIDTH;
  const height = opts?.height ?? SIM_HEIGHT;
  const iterations = opts?.iterations ?? 500;
  const linkDistance = opts?.linkDistance ?? 200;
  const charge = opts?.charge ?? -3200;
  const gravity = opts?.gravity ?? 0.012;

  if (nodes.length === 0) return [];

  const cx = width / 2;
  const cy = height / 2;
  const spread = Math.min(width, height) * 0.42;

  const sim: SimNode[] = nodes.map((n, i) => {
    const hasPos = Number.isFinite(n.x) && Number.isFinite(n.y);
    const init = hasPos ? { x: n.x!, y: n.y! } : initialPosition(n.id, i, nodes.length, cx, cy, spread);
    return { ...n, x: init.x, y: init.y, vx: 0, vy: 0 };
  });

  const byId = new Map(sim.map((n) => [n.id, n]));
  const edges = links
    .map((l) => {
      const s = byId.get(l.source);
      const t = byId.get(l.target);
      return s && t ? { s, t } : null;
    })
    .filter(Boolean) as { s: SimNode; t: SimNode }[];

  for (let tick = 0; tick < iterations; tick++) {
    const alpha = Math.pow(1 - tick / iterations, 1.4);

    // Repulsion — stronger when nodes are close (label-aware min distance)
    for (let i = 0; i < sim.length; i++) {
      for (let j = i + 1; j < sim.length; j++) {
        const a = sim[i];
        const b = sim[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distSq = dx * dx + dy * dy;
        const minDist = nodeCollisionRadius(a.linkCount, a.title) + nodeCollisionRadius(b.linkCount, b.title);

        if (distSq < 1) {
          const jitter = ((hashId(a.id + b.id) % 100) / 100) * 0.8 + 0.2;
          dx = jitter;
          dy = 1 - jitter;
          distSq = dx * dx + dy * dy;
        }

        const dist = Math.sqrt(distSq);
        // Extra push when inside collision radius
        const overlap = minDist - dist;
        const repulse =
          overlap > 0
            ? (overlap * 0.35 + 40) * alpha
            : (charge * alpha) / Math.max(distSq, 900);
        const fx = (dx / dist) * repulse;
        const fy = (dy / dist) * repulse;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // Springs — weaker pull so hubs don't collapse
    for (const { s, t } of edges) {
      let dx = t.x - s.x;
      let dy = t.y - s.y;
      const dist = Math.hypot(dx, dy) || 1;
      const target = linkDistance + (nodeCollisionRadius(s.linkCount, s.title) + nodeCollisionRadius(t.linkCount, t.title)) * 0.15;
      const force = ((dist - target) / dist) * 0.06 * alpha;
      dx *= force;
      dy *= force;
      s.vx += dx;
      s.vy += dy;
      t.vx -= dx;
      t.vy -= dy;
    }

    // Weak center gravity
    for (const n of sim) {
      n.vx += (cx - n.x) * gravity * alpha;
      n.vy += (cy - n.y) * gravity * alpha;
    }

    for (const n of sim) {
      n.vx *= 0.5;
      n.vy *= 0.5;
      n.x += n.vx;
      n.y += n.vy;
    }
  }

  resolveOverlaps(sim, width, height, 220);
  centerInViewport(sim, width, height);
  resolveOverlaps(sim, width, height, 80);

  return sim;
}

export function nodeRadius(linkCount: number, hovered = false): number {
  const base = 3.5 + Math.sqrt(Math.max(linkCount, 1)) * 1.4;
  return Math.min(hovered ? base + 2 : base, 11);
}

export const FORCE_LAYOUT_CANVAS = { width: SIM_WIDTH, height: SIM_HEIGHT };
