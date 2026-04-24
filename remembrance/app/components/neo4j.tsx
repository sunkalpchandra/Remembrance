"use client";
import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d").then((mod) => mod.default),
  { ssr: false },
);

// ── Types ─────────────────────────────────────────────────────────────────────
type NodeT = {
  id: string;
  label?: string;
  type?: string;
  emoji?: string;
  content?: string;
  memoryId?: string;
  color?: string;
  x?: number;
  y?: number;
  [k: string]: any;
};
type LinkT = { source: string | any; target: string | any; chain?: boolean; [k: string]: any };

// ── Palette ───────────────────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  user:    "#374151",
  memory:  "#6366f1",
  family:  "#ec4899",
  event:   "#f59e0b",
  health:  "#10b981",
  place:   "#3b82f6",
  work:    "#8b5cf6",
  emotion: "#ef4444",
  social:  "#14b8a6",
};

const TYPE_EMOJI: Record<string, string> = {
  user:    "👤",
  memory:  "🧠",
  family:  "👨‍👩‍👧",
  event:   "🎉",
  health:  "💊",
  place:   "📍",
  work:    "💼",
  emotion: "❤️",
  social:  "🤝",
};

const nodeColor = (n: NodeT) =>
  n.color ?? TYPE_COLOR[n.type ?? "memory"] ?? TYPE_COLOR.memory;

// ── Component ─────────────────────────────────────────────────────────────────
export default function Neo4jGraph({
  userId,
  memoryId,
  onNodeClick,
}: {
  userId: string;
  memoryId?: string | null;
  onNodeClick?: (n: NodeT) => void;
}) {
  const [fullGraph, setFullGraph] = useState<{ nodes: NodeT[]; links: LinkT[] }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverNode, setHoverNode] = useState<NodeT | null>(null);
  // Use viewport (clientX/Y) coords so tooltip renders via position:fixed
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [graphKey, setGraphKey] = useState(0);
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });

  // Measure container
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setDims({ width: r.width, height: r.height });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Fetch graph
  const fetchGraph = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/graph", { signal });
      if (!res.ok) throw new Error("Failed to load graph");
      const data = await res.json();
      const nodes: NodeT[] = (data.nodes ?? []).map((n: NodeT) => ({
        ...n,
        color: TYPE_COLOR[n.type ?? "memory"] ?? TYPE_COLOR.memory,
      }));
      setFullGraph({ nodes, links: data.links ?? [] });
    } catch (e: any) {
      if (e.name !== "AbortError") setError(e.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchGraph(ctrl.signal);
    // Auto-refresh every 30s so newly saved memories appear automatically
    const interval = setInterval(() => fetchGraph(), 30_000);
    return () => { ctrl.abort(); clearInterval(interval); };
  }, [fetchGraph]);

  // Filter visible nodes by memoryId if provided
  const visibleGraph = useMemo(() => {
    const { nodes, links } = fullGraph;
    if (!memoryId) return { nodes, links };
    const inMem = new Set(nodes.filter(n => n.memoryId === memoryId).map(n => n.id));
    const neighbors = new Set([...inMem]);
    links.forEach(l => {
      const s = String(typeof l.source === "object" ? l.source.id : l.source);
      const t = String(typeof l.target === "object" ? l.target.id : l.target);
      if (inMem.has(s)) neighbors.add(t);
      if (inMem.has(t)) neighbors.add(s);
    });
    const filteredNodes = nodes.filter(n => neighbors.has(n.id));
    const ids = new Set(filteredNodes.map(n => n.id));
    return {
      nodes: filteredNodes,
      links: links.filter(l => {
        const s = String(typeof l.source === "object" ? l.source.id : l.source);
        const t = String(typeof l.target === "object" ? l.target.id : l.target);
        return ids.has(s) && ids.has(t);
      }),
    };
  }, [fullGraph, memoryId]);

  // Auto-center when engine stops
  const centerGraph = useCallback(() => {
    if (!fgRef.current || dims.width === 0) return;
    setTimeout(() => {
      try { fgRef.current?.zoomToFit(400, 60); } catch {}
    }, 100);
  }, [dims]);

  // Store viewport coords directly — tooltip uses position:fixed
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  // ── Node canvas rendering (Neo4j-style circle) ──────────────────────────────
  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isHovered = hoverNode?.id === node.id;
      const isUser = node.type === "user";
      const x = node.x ?? 0, y = node.y ?? 0;

      ctx.save();

      // Emoji — no circle background
      const emojiSize = Math.max(10, Math.min(isUser ? 22 : 18, 20)) / globalScale;
      ctx.font = `${emojiSize}px system-ui, "Apple Color Emoji", "Segoe UI Emoji"`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.emoji ?? TYPE_EMOJI[node.type ?? "memory"] ?? "🧠", x, y);

      // Label below node — always visible, short
      const raw: string = node.label ?? "";
      const LABEL_CHARS = 16;
      const short = raw.length > LABEL_CHARS ? raw.substring(0, LABEL_CHARS - 1) + "…" : raw;

      // Fixed screen-space font: ~11px on screen
      const labelPx = 11 / globalScale;
      if (labelPx < 60) {
        ctx.font = `500 ${labelPx}px -apple-system, "Segoe UI", sans-serif`;
        ctx.textBaseline = "top";

        const labelY = y + emojiSize * 0.6 + 3 / globalScale;
        const tw = ctx.measureText(short).width;
        const padH = 3 / globalScale, padV = 2 / globalScale;

        // Pill background
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.roundRect(x - tw / 2 - padH, labelY - padV, tw + padH * 2, labelPx + padV * 2, 4 / globalScale);
        ctx.fill();

        ctx.fillStyle = isHovered ? "#111" : "#444";
        ctx.textAlign = "center";
        ctx.fillText(short, x, labelY);
      }

      ctx.restore();
    },
    [hoverNode],
  );

  const nodePointerAreaPaint = useCallback(
    (node: any, color: string, ctx: CanvasRenderingContext2D) => {
      const hw = node.type === "user" ? 20 : 16;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.rect((node.x ?? 0) - hw, (node.y ?? 0) - hw, hw * 2, hw * 2);
      ctx.fill();
    },
    [],
  );

  const handleNodeClick = useCallback((node: NodeT) => {
    onNodeClick?.(node);
    try { fgRef.current?.centerAt(node.x, node.y, 400); } catch {}
  }, [onNodeClick]);

  // ── Tooltip ───────────────────────────────────────────────────────────────
  const tooltip = hoverNode && tooltipPos && hoverNode.content && hoverNode.type !== "user";
  const TOOLTIP_W = 240;

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white overflow-hidden relative"
      onMouseMove={handleMouseMove}
    >
      {/* States */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
          Loading…
        </div>
      )}
      {!loading && error && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
          No graph data available
        </div>
      )}
      {!loading && !error && fullGraph.nodes.length <= 1 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
          No memories yet — chat to save some
        </div>
      )}

      {/* Graph */}
      {!loading && fullGraph.nodes.length > 1 && (
        // @ts-expect-error react-force-graph-2d types
        <ForceGraph2D
          key={graphKey}
          ref={fgRef}
          graphData={visibleGraph}
          width={dims.width}
          height={dims.height}
          autoPauseRedraw={true}
          warmupTicks={150}
          cooldownTicks={80}
          nodeRelSize={0}
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={nodePointerAreaPaint}
          onNodeClick={handleNodeClick}
          onNodeHover={(n: NodeT | null) => {
            setHoverNode(n);
            if (!n) setTooltipPos(null);
          }}
          linkColor={(l: any) => l.chain ? "rgba(99,102,241,0.5)" : "rgba(180,180,180,0.3)"}
          linkWidth={(l: any) => l.chain ? 1.5 : 1}
          linkDirectionalArrowLength={0}
          d3AlphaDecay={0.012}
          d3VelocityDecay={0.3}
          linkDistance={200}
          chargeStrength={-1200}
          centerStrength={0.03}
          onEngineStop={centerGraph}
        />
      )}

      {/* Tooltip — fixed to viewport so it's never clipped by siblings */}
      {tooltip && tooltipPos && (
        <div
          className="pointer-events-none fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl p-3.5 text-xs"
          style={{
            width: TOOLTIP_W,
            top: tooltipPos.y + 16,
            ...(tooltipPos.x + TOOLTIP_W + 20 > (typeof window !== "undefined" ? window.innerWidth : 9999)
              ? { right: (typeof window !== "undefined" ? window.innerWidth - tooltipPos.x + 12 : 20), left: "auto" }
              : { left: tooltipPos.x + 14 }),
          }}
        >
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="text-base leading-none">{hoverNode!.emoji ?? "🧠"}</span>
            <span className="font-semibold text-gray-900 leading-tight">{hoverNode!.label}</span>
          </div>
          {hoverNode!.content && (
            <>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Memory</p>
              <p className="text-gray-600 leading-relaxed line-clamp-6 whitespace-pre-wrap">
                {hoverNode!.content}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
