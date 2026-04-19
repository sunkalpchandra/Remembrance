"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { UserContext } from "./usercontext";
import { Search, Plus, Minus, Maximize2, X, User, MapPin, Calendar, Box, Lightbulb } from "lucide-react";

const ForceGraph2D = dynamic(
  () => import("react-force-graph").then((m) => m.ForceGraph2D),
  { ssr: false }
);

type EntityType = "person" | "place" | "event" | "object" | "memory";

type Entity = {
  name: string;
  type: EntityType;
  memories: number[];
};

type Memory = { id: string; memory: string };

type GraphNode = {
  id: string;
  label: string;
  type: EntityType;
  memoryId?: string;
  entityRef?: Entity;
  degree: number;
  x?: number;
  y?: number;
};

type GraphLink = { source: string; target: string };

const TYPE_COLORS: Record<EntityType, string> = {
  person: "#2563eb",
  place: "#059669",
  event: "#d97706",
  object: "#7c3aed",
  memory: "#64748b",
};

const TYPE_ICONS: Record<EntityType, React.ComponentType<{ className?: string }>> = {
  person: User,
  place: MapPin,
  event: Calendar,
  object: Box,
  memory: Lightbulb,
};

const TYPE_LABELS: Record<EntityType, string> = {
  person: "People",
  place: "Places",
  event: "Events",
  object: "Things",
  memory: "Memories",
};

export function MemoryGraph() {
  const user = useContext(UserContext);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<any>(null);
  const [size, setSize] = useState({ w: 1, h: 1 });

  const [entities, setEntities] = useState<Entity[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<EntityType>>(
    new Set(["person", "place", "event", "object", "memory"])
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch graph data
  useEffect(() => {
    if (!user?.uid) return;
    let aborted = false;
    setLoading(true);
    setError(null);
    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/graph/${user.uid}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (aborted) return;
        setEntities(Array.isArray(data.entities) ? data.entities : []);
        setMemories(Array.isArray(data.memories) ? data.memories : []);
        setLoading(false);
      })
      .catch((e) => {
        if (aborted) return;
        setError(e?.message || "Failed to load graph");
        setLoading(false);
      });
    return () => {
      aborted = true;
    };
  }, [user?.uid]);

  // Track container size for canvas
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Build nodes + links
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    for (const e of entities) {
      nodes.push({
        id: `entity:${e.type}:${e.name}`,
        label: e.name,
        type: (e.type as EntityType) in TYPE_COLORS ? (e.type as EntityType) : "object",
        entityRef: e,
        degree: e.memories?.length || 0,
      });
    }

    for (let i = 0; i < memories.length; i++) {
      const m = memories[i];
      nodes.push({
        id: `mem:${m.id}`,
        label: m.memory.slice(0, 40) + (m.memory.length > 40 ? "…" : ""),
        type: "memory",
        memoryId: m.id,
        degree: 1,
      });
    }

    for (const e of entities) {
      const entityNodeId = `entity:${e.type}:${e.name}`;
      for (const idx of e.memories || []) {
        const m = memories[idx - 1];
        if (!m) continue;
        links.push({ source: entityNodeId, target: `mem:${m.id}` });
      }
    }

    // compute degree from links
    const deg: Record<string, number> = {};
    for (const l of links) {
      deg[l.source as string] = (deg[l.source as string] || 0) + 1;
      deg[l.target as string] = (deg[l.target as string] || 0) + 1;
    }
    for (const n of nodes) n.degree = deg[n.id] || 1;

    return { nodes, links };
  }, [entities, memories]);

  // Filter nodes by type and search
  const visibleData = useMemo(() => {
    const q = search.trim().toLowerCase();
    const allowed = new Set(graphData.nodes
      .filter((n) => activeTypes.has(n.type) && (!q || n.label.toLowerCase().includes(q)))
      .map((n) => n.id));
    const nodes = graphData.nodes.filter((n) => allowed.has(n.id));
    const links = graphData.links.filter(
      (l) => allowed.has(l.source as string) && allowed.has(l.target as string)
    );
    return { nodes, links };
  }, [graphData, activeTypes, search]);

  const selectedNode = useMemo(
    () => graphData.nodes.find((n) => n.id === selectedId) || null,
    [selectedId, graphData]
  );

  const memoriesForSelected = useMemo(() => {
    if (!selectedNode) return [];
    if (selectedNode.type === "memory") {
      const m = memories.find((mm) => mm.id === selectedNode.memoryId);
      return m ? [m] : [];
    }
    const e = selectedNode.entityRef;
    if (!e) return [];
    return (e.memories || [])
      .map((idx) => memories[idx - 1])
      .filter(Boolean) as Memory[];
  }, [selectedNode, memories]);

  const toggleType = (t: EntityType) =>
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const typeCounts = useMemo(() => {
    const c: Record<EntityType, number> = { person: 0, place: 0, event: 0, object: 0, memory: 0 };
    for (const n of graphData.nodes) c[n.type]++;
    return c;
  }, [graphData]);

  const handleZoomIn = () => graphRef.current?.zoom(graphRef.current.zoom() * 1.3, 250);
  const handleZoomOut = () => graphRef.current?.zoom(graphRef.current.zoom() / 1.3, 250);
  const handleFit = () => graphRef.current?.zoomToFit(400, 80);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#fafafa]">
      {/* Canvas */}
      {!loading && !error && visibleData.nodes.length > 0 && (
        <ForceGraph2D
          ref={graphRef}
          width={size.w}
          height={size.h}
          graphData={visibleData}
          backgroundColor="#fafafa"
          nodeId="id"
          linkColor={() => "rgba(100,116,139,0.25)"}
          linkWidth={1}
          nodeRelSize={4}
          cooldownTicks={100}
          onEngineStop={() => graphRef.current?.zoomToFit(400, 80)}
          onNodeClick={(n: any) => setSelectedId(n.id)}
          onBackgroundClick={() => setSelectedId(null)}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const isSelected = node.id === selectedId;
            const radius = Math.max(3.5, Math.min(9, 3.5 + Math.sqrt(node.degree) * 1.6));
            const color = TYPE_COLORS[node.type as EntityType];

            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            if (isSelected) {
              ctx.lineWidth = 2.5 / globalScale;
              ctx.strokeStyle = "#0f172a";
              ctx.stroke();
            }

            // Labels only on hover / for bigger nodes at reasonable zoom
            const showLabel = isSelected || node.degree >= 3 || globalScale > 1.4;
            if (showLabel) {
              const fontSize = Math.max(9, 11 / globalScale);
              ctx.font = `${fontSize}px ui-sans-serif, system-ui`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              const label = node.label || "";
              const padY = radius + 3;
              // subtle white halo for legibility
              ctx.fillStyle = "rgba(255,255,255,0.85)";
              const metrics = ctx.measureText(label);
              ctx.fillRect(
                node.x - metrics.width / 2 - 3,
                node.y + padY - 1,
                metrics.width + 6,
                fontSize + 2
              );
              ctx.fillStyle = "#0f172a";
              ctx.fillText(label, node.x, node.y + padY);
            }
          }}
        />
      )}

      {/* Toolbar */}
      <div className="absolute top-4 left-4 right-4 flex items-start gap-3 pointer-events-none">
        <div className="flex flex-col gap-3 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-xl shadow-sm flex items-center gap-2 px-3 py-2 w-[320px]">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memory graph…"
              className="bg-transparent outline-none text-sm flex-1 placeholder-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(TYPE_LABELS) as EntityType[]).map((t) => {
              const Icon = TYPE_ICONS[t];
              const active = activeTypes.has(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    active
                      ? "bg-white border-gray-200 text-gray-800 shadow-sm"
                      : "bg-transparent border-gray-200 text-gray-400"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: active ? TYPE_COLORS[t] : "#d1d5db" }}
                  />
                  <Icon className="w-3 h-3" />
                  {TYPE_LABELS[t]}
                  <span className="tabular-nums text-gray-400">{typeCounts[t]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-5 left-5 flex flex-col gap-1 bg-white/90 backdrop-blur border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <button onClick={handleZoomIn} className="p-2 hover:bg-gray-50" aria-label="Zoom in">
          <Plus className="w-4 h-4 text-gray-600" />
        </button>
        <div className="h-px bg-gray-200" />
        <button onClick={handleZoomOut} className="p-2 hover:bg-gray-50" aria-label="Zoom out">
          <Minus className="w-4 h-4 text-gray-600" />
        </button>
        <div className="h-px bg-gray-200" />
        <button onClick={handleFit} className="p-2 hover:bg-gray-50" aria-label="Fit to screen">
          <Maximize2 className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Loading / empty / error states */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
            <span className="text-sm">Loading your memory graph…</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white border border-red-200 rounded-lg px-6 py-5 shadow-sm text-center max-w-sm">
            <div className="text-red-500 text-sm font-medium mb-1">Couldn't load graph</div>
            <div className="text-gray-500 text-xs">{error}</div>
          </div>
        </div>
      )}
      {!loading && !error && graphData.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-sm">
            <div className="text-gray-700 text-base font-medium mb-1">Your graph is empty</div>
            <div className="text-gray-500 text-sm">
              As you chat, people, places, and events you mention will appear here.
            </div>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selectedNode && (
        <div className="absolute top-4 right-4 bottom-4 w-[360px] bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-lg flex flex-col overflow-hidden">
          <div className="flex items-start gap-3 p-4 border-b border-gray-100">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: TYPE_COLORS[selectedNode.type] + "1a", color: TYPE_COLORS[selectedNode.type] }}
            >
              {(() => {
                const Icon = TYPE_ICONS[selectedNode.type];
                return <Icon className="w-4 h-4" />;
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {selectedNode.label}
              </div>
              <div className="text-xs text-gray-500 capitalize">
                {selectedNode.type} · {memoriesForSelected.length}{" "}
                {memoriesForSelected.length === 1 ? "memory" : "memories"}
              </div>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="text-gray-400 hover:text-gray-600 p-1 -m-1"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {memoriesForSelected.length === 0 ? (
              <div className="text-sm text-gray-400 p-4 text-center">No memories linked.</div>
            ) : (
              memoriesForSelected.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-700 leading-relaxed"
                >
                  {m.memory}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
