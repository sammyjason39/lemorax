"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { brand } from "@/lib/brand";
import { NOTE_TYPE_COLORS } from "@/components/vault/VaultMarkdown";
import {
  computeForceLayout,
  FORCE_LAYOUT_CANVAS,
  nodeRadius,
} from "@/lib/vault/force-layout";
import type { VaultGraphEdge, VaultGraphNode } from "@/lib/vault/graph";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json());

type Props = {
  onSelectNote: (id: string) => void;
};

type LayoutNode = VaultGraphNode & { x: number; y: number };

const GRAPH_BG = "#14141a";
const GRAPH_EDGE = "rgba(255,255,255,0.12)";
const GRAPH_EDGE_HI = "rgba(147,197,253,0.55)";
const GRAPH_LABEL = "rgba(255,255,255,0.72)";
const ZOOM_MIN = 0.35;
const ZOOM_MAX = 4.2; // ~40% beyond previous max (3)

const { width: CANVAS_W, height: CANVAS_H } = FORCE_LAYOUT_CANVAS;

export function VaultGraphView({ onSelectNote }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewport, setViewport] = useState({ width: CANVAS_W, height: CANVAS_H });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const dragRef = useRef<{ panning: boolean; lastX: number; lastY: number } | null>(null);

  const { data, isLoading } = useSWR<{ nodes: VaultGraphNode[]; edges: VaultGraphEdge[] }>(
    "/api/vault/graph",
    fetcher
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setViewport({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Layout only when graph data changes — fixed simulation canvas, scaled via viewBox
  const positioned = useMemo((): LayoutNode[] => {
    const nodes = data?.nodes ?? [];
    const edges = data?.edges ?? [];
    if (!nodes.length) return [];

    const layout = computeForceLayout(
      nodes.map((n) => ({
        id: n.id,
        title: n.title,
        vx: 0,
        vy: 0,
        linkCount: n.linkCount,
      })),
      edges.map((e) => ({ source: e.source, target: e.target }))
    );

    const posMap = new Map(layout.map((n) => [n.id, n]));
    return nodes.map((n) => {
      const p = posMap.get(n.id);
      if (!p) return { ...n, x: CANVAS_W / 2, y: CANVAS_H / 2 };
      return { ...n, x: p.x, y: p.y };
    });
  }, [data?.nodes, data?.edges]);

  const posMap = useMemo(() => new Map(positioned.map((n) => [n.id, n])), [positioned]);

  const neighborSet = useMemo(() => {
    if (!hoverId || !data?.edges) return new Set<string>();
    const s = new Set<string>([hoverId]);
    for (const e of data.edges) {
      if (e.source === hoverId) s.add(e.target);
      if (e.target === hoverId) s.add(e.source);
    }
    return s;
  }, [hoverId, data?.edges]);

  const clientToViewBox = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  }, []);

  const screenDeltaToViewBox = useCallback((clientX: number, clientY: number, dx: number, dy: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: dx, y: dy };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: dx, y: dy };
    const inv = ctm.inverse();
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const a = pt.matrixTransform(inv);
    pt.x = clientX + dx;
    pt.y = clientY + dy;
    const b = pt.matrixTransform(inv);
    return { x: b.x - a.x, y: b.y - a.y };
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const viewPt = clientToViewBox(e.clientX, e.clientY);
      if (!viewPt) return;

      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      setTransform((t) => {
        const newK = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, t.k * factor));
        const localX = (viewPt.x - t.x) / t.k;
        const localY = (viewPt.y - t.y) / t.k;
        return {
          x: viewPt.x - localX * newK,
          y: viewPt.y - localY * newK,
          k: newK,
        };
      });
    },
    [clientToViewBox]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const tag = (e.target as SVGElement).tagName?.toLowerCase();
    if (tag === "circle" || tag === "text") return;
    dragRef.current = { panning: true, lastX: e.clientX, lastY: e.clientY };
    containerRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d?.panning) return;
      const dx = e.clientX - d.lastX;
      const dy = e.clientY - d.lastY;
      d.lastX = e.clientX;
      d.lastY = e.clientY;
      const viewDelta = screenDeltaToViewBox(e.clientX, e.clientY, dx, dy);
      setTransform((t) => ({ ...t, x: t.x + viewDelta.x, y: t.y + viewDelta.y }));
    },
    [screenDeltaToViewBox]
  );

  const onPointerUp = useCallback(() => {
    if (dragRef.current) dragRef.current.panning = false;
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
        Memuat graph…
      </div>
    );
  }

  if (!data?.nodes?.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
        Belum ada catatan untuk graph view.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div
        className="px-4 py-2 text-xs border-b flex flex-wrap gap-3 shrink-0"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-primary)" }}
      >
        <span>{data.nodes.length} catatan · {data.edges.length} koneksi</span>
        <span className="opacity-60">Scroll zoom · drag untuk geser</span>
        {Object.entries(NOTE_TYPE_COLORS).map(([type, color]) => (
          <span key={type} className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {type}
          </span>
        ))}
      </div>

      <div
        ref={containerRef}
        className="flex-1 min-h-0 relative overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ background: GRAPH_BG }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <svg
          ref={svgRef}
          width={viewport.width}
          height={viewport.height}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
        >
          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
            {data.edges.map((e) => {
              const s = posMap.get(e.source);
              const t = posMap.get(e.target);
              if (!s || !t) return null;
              const highlighted =
                hoverId !== null && (e.source === hoverId || e.target === hoverId);
              const dimmed = hoverId !== null && !highlighted;
              return (
                <line
                  key={e.id}
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={highlighted ? GRAPH_EDGE_HI : GRAPH_EDGE}
                  strokeWidth={highlighted ? 1.5 : 1}
                  strokeOpacity={dimmed ? 0.12 : highlighted ? 0.9 : 0.4}
                />
              );
            })}

            {positioned.map((n) => {
              const color = NOTE_TYPE_COLORS[n.noteType] ?? brand.blue;
              const active = hoverId === n.id;
              const neighbor = neighborSet.has(n.id);
              const dimmed = hoverId !== null && !active && !neighbor;
              const r = nodeRadius(n.linkCount, active);
              const label = n.title.length > 28 ? `${n.title.slice(0, 26)}…` : n.title;
              const labelX = n.x + r + 8;
              const labelY = n.y + 1;

              return (
                <g
                  key={n.id}
                  onMouseEnter={() => setHoverId(n.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNote(n.id);
                  }}
                  className="cursor-pointer"
                  style={{ opacity: dimmed ? 0.22 : 1 }}
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={r}
                    fill={active || neighbor ? color : "rgba(255,255,255,0.6)"}
                    fillOpacity={active ? 1 : neighbor ? 0.92 : 0.75}
                    stroke={active ? "#fff" : "transparent"}
                    strokeWidth={1.5}
                  />
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="start"
                    dominantBaseline="middle"
                    className="select-none pointer-events-none"
                    style={{
                      fontSize: active ? 11 : 10,
                      fill: active || neighbor ? GRAPH_LABEL_HI : GRAPH_LABEL,
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
