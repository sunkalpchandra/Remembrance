"use client";
import dynamic from "next/dynamic";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const ForceGraph2D = dynamic(
  () => import("react-force-graph").then((mod) => mod.ForceGraph2D),
  { ssr: false },
);

// ---------- Helpers ----------
const colorForId = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = id.charCodeAt(i) + ((h << 5) - h);
    h |= 0;
  }
  return `hsl(${Math.abs(h) % 360}, 68%, 58%)`;
};

// Wait until a single node has x,y (or timeout)
const waitForNodePosition = async (node: any, maxTries = 30, delay = 40) => {
  let tries = 0;
  while ((node.x === undefined || node.y === undefined) && tries < maxTries) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, delay));
    tries++;
  }
  return node.x !== undefined && node.y !== undefined;
};

// Wait until *all* nodes in array have positions (or timeout)
const waitForAllNodePositions = async (
  nodes: any[],
  maxTries = 60,
  delay = 40,
) => {
  let tries = 0;
  while (tries < maxTries) {
    const allReady =
      nodes.length === 0 ||
      nodes.every((n) => n.x !== undefined && n.y !== undefined);
    if (allReady) return true;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, delay));
    tries++;
  }
  return nodes.length === 0
    ? true
    : nodes.every((n) => n.x !== undefined && n.y !== undefined);
};

// compute bounding box + center
const bboxAndCenter = (nodes: any[]) => {
  if (!nodes || !nodes.length) return null;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  nodes.forEach((n) => {
    if (n.x === undefined || n.y === undefined) return;
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x);
    maxY = Math.max(maxY, n.y);
  });
  if (minX === Infinity) return null;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
};

// ---------- Emojis default ----------
const DEFAULT_EMOJI_MAP: Record<string, string> = {
  user: "👤",
  memory: "🧠",
  idea: "💡",
  event: "📅",
  location: "📍",
  default: "🔹",
};

// ---------- Types ----------
type NodeT = {
  id: string;
  label?: string;
  memoryId?: string;
  type?: string;
  color?: string;
  x?: number;
  y?: number;
  [k: string]: any;
};

type LinkT = {
  source: string | number;
  target: string | number;
  [k: string]: any;
};

// ---------- Component ----------
export default function Neo4jGraph({
  userId,
  memoryId,
  onNodeClick,
  emojiMap = DEFAULT_EMOJI_MAP,
}: {
  userId: string;
  memoryId?: string | null;
  onNodeClick?: (n: NodeT) => void;
  emojiMap?: Record<string, string>;
}) {
  const [fullGraph, setFullGraph] = useState<{
    nodes: NodeT[];
    links: LinkT[];
  }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverNode, setHoverNode] = useState<NodeT | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeT | null>(null);
  // force remount for clean layout when switching memory
  const [graphKey, setGraphKey] = useState<number>(0);
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Measure container dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Subtract header height from total height if it's part of the container's 560px
        // If the 560px is the total height including header, then the graph area is 560 - 60 = 500px
        setContainerDimensions({ width: rect.width, height: rect.height - 60 });
      }
    };
    updateDimensions(); // Initial measurement
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // ---------- initial fetch once ----------
  useEffect(() => {
    const ctrl = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:5000/user/${userId}/graph`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("Failed to load graph");
        const data = await res.json();
        const nodes: NodeT[] = (data.nodes || []).map((n: NodeT) => ({
          ...n,
          color: n.color ?? colorForId(String(n.id ?? Math.random())),
        }));
        const links: LinkT[] = data.links || [];
        setFullGraph({ nodes, links });
      } catch (err: any) {
        if (err.name !== "AbortError")
          setError(err.message ?? "Error loading graph");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => ctrl.abort();
  }, [userId]);

  // ---------- Visible graph: nodes in memoryId + 1-hop neighbors ----------
  const visibleGraph = useMemo(() => {
    const allNodes = fullGraph.nodes;
    const allLinks = fullGraph.links;
    if (!memoryId) return { nodes: allNodes, links: allLinks };

    // nodes in the memory
    const inMem = new Set(
      allNodes.filter((n) => n.memoryId === memoryId).map((n) => n.id),
    );
    // add 1-hop neighbors
    const neighborIds = new Set<string>([...inMem]);
    allLinks.forEach((l) => {
      const s = String(l.source),
        t = String(l.target);
      if (inMem.has(s)) neighborIds.add(t);
      if (inMem.has(t)) neighborIds.add(s);
    });

    const nodes = allNodes.filter((n) => neighborIds.has(String(n.id)));
    const nodeIdSet = new Set(nodes.map((n) => String(n.id)));
    const links = allLinks.filter(
      (l) => nodeIdSet.has(String(l.source)) && nodeIdSet.has(String(l.target)),
    );

    return { nodes, links };
  }, [fullGraph, memoryId]);

  // ---------- Ensure memory cluster exists; sync if not ----------
  const ensureMemoryLoaded = useCallback(
    async (memId?: string | null) => {
      if (!memId) return;
      const exists = fullGraph.nodes.some((n) => n.memoryId === memId);
      if (exists) return;
      // else ask server to populate, then re-fetch
      try {
        await fetch(`http://localhost:5000/user/${userId}/populate_graph`, {
          method: "POST",
        });
        const res = await fetch(`http://localhost:5000/user/${userId}/graph`);
        if (!res.ok) throw new Error("Failed to fetch after populate");
        const data = await res.json();
        const nodes: NodeT[] = (data.nodes || []).map((n: NodeT) => ({
          ...n,
          color: n.color ?? colorForId(String(n.id ?? Math.random())),
        }));
        setFullGraph({ nodes, links: data.links || [] });
      } catch (err) {
        console.error("ensureMemoryLoaded error:", err);
      }
    },
    [fullGraph.nodes, userId],
  );

  // ---------- Enhanced centering logic that accounts for container dimensions ----------
  const centerGraphInContainer = useCallback(async () => {
    if (
      !fgRef.current ||
      containerDimensions.width === 0 ||
      containerDimensions.height === 0
    )
      return;

    const nodesToWait = visibleGraph.nodes;
    // Wait for positions to be available
    const readyAll = await waitForAllNodePositions(nodesToWait, 80, 35);

    if (nodesToWait.length === 0) {
      // No nodes, center at origin
      try {
        fgRef.current.centerAt(0, 0, 300);
      } catch (e) {
        /* ignore */
      }
      return;
    }

    // Compute bounding box of nodes
    const box = bboxAndCenter(nodesToWait);
    if (!box) {
      try {
        fgRef.current.centerAt(0, 0, 300);
      } catch (e) {
        /* ignore */
      }
      return;
    }

    // Calculate the scale needed to fit the graph in the container with some padding
    const padding = 80; // Increased padding for better distributed layout
    const availableWidth = containerDimensions.width - padding * 2;
    const availableHeight = containerDimensions.height - padding * 2;

    // Calculate scale to fit the content
    const scaleX = box.width > 0 ? availableWidth / box.width : 1;
    const scaleY = box.height > 0 ? availableHeight / box.height : 1;
    const optimalScale = Math.min(scaleX, scaleY, 3); // Reduced max zoom for better distributed view

    // Center the graph
    try {
      // First center at the computed center of the nodes
      fgRef.current.centerAt(box.centerX, box.centerY, 400);
      // Then adjust zoom to fit nicely in container
      if (
        optimalScale < 1 ||
        box.width > availableWidth ||
        box.height > availableHeight
      ) {
        setTimeout(() => {
          try {
            fgRef.current.zoom(Math.max(0.4, optimalScale), 300);
          } catch (e) {
            /* ignore */
          }
        }, 450);
      }
    } catch (e) {
      // Fallback to simple center
      try {
        fgRef.current.centerAt(0, 0, 200);
      } catch (err) {
        /* ignore */
      }
    }
  }, [visibleGraph.nodes, containerDimensions]);

  // ---------- On memory change: ensure loaded then remount & center ----------
  useEffect(() => {
    let mounted = true;
    const handleMemoryChange = async () => {
      await ensureMemoryLoaded(memoryId);
      if (!mounted) return;
      // bump key to force remount (clean layout)
      setGraphKey((k) => k + 1);
      // After remount, wait a bit then center properly
      setTimeout(async () => {
        if (!mounted) return;
        await centerGraphInContainer();
      }, 100);
    };
    void handleMemoryChange();
    return () => {
      mounted = false;
    };
  }, [memoryId, ensureMemoryLoaded, fullGraph, centerGraphInContainer]);

  // ---------- node click -> smooth zoom + center ----------
  const focusNode = useCallback(
    async (node: NodeT, zoomLevel = 3.8, duration = 700) => {
      if (!fgRef.current || !node) return;
      // ensure node has pos
      const ready = await waitForNodePosition(node, 40, 30);
      const x = node.x ?? 0,
        y = node.y ?? 0;
      if (!ready) {
        fgRef.current.centerAt(x, y, 200);
        fgRef.current.zoom(zoomLevel, duration);
        return;
      }
      // center then zoom for nicer feel
      fgRef.current.centerAt(x, y, Math.floor(duration * 0.8));
      fgRef.current.zoom(zoomLevel, duration);
    },
    [],
  );

  const handleNodeClick = useCallback(
    (node: NodeT) => {
      setSelectedNode(node);
      void focusNode(node, 3.6, 720);
      onNodeClick?.(node);
    },
    [focusNode, onNodeClick],
  );

  // ---------- emoji & rendering ----------
  const emojiForNode = useCallback(
    (node: NodeT) => {
      if (node.type && emojiMap[node.type]) return emojiMap[node.type];
      if (node.label && /user/i.test(String(node.label)))
        return emojiMap.user ?? "👤";
      if (node.memoryId) return emojiMap.memory ?? "🧠";
      return emojiMap.default ?? "🔹";
    },
    [emojiMap],
  );

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isHovered = Boolean(hoverNode && hoverNode.id === node.id);
      // emoji size scales w/ globalScale but clamped
      const baseEmojiPx = Math.max(
        10,
        Math.min(36, 16 * Math.sqrt(globalScale)),
      );

      ctx.save();
      const emoji = emojiForNode(node);
      ctx.font = `${baseEmojiPx}px system-ui, -apple-system, "Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // subtle stroke for hovered when zoomed
      if (globalScale > 2.2 && isHovered) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0,0,0,0.14)";
        ctx.strokeText(emoji, node.x, node.y);
      }

      ctx.fillText(emoji, node.x, node.y);

      // SHOW LABEL ONLY when hovered or selected (no globalScale threshold)
      const isSelected = Boolean(selectedNode && selectedNode.id === node.id);
      if (node.label && (isHovered || isSelected)) {
        // pick a readable font size scaled with zoom
        const labelFont = Math.max(10, Math.min(14, (14 / globalScale) * 2));
        ctx.font = `${labelFont}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial`;
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.textBaseline = "top";
        ctx.fillText(String(node.label), node.x, node.y + baseEmojiPx / 1.6);
      }

      ctx.restore();
    },
    [hoverNode, selectedNode, emojiForNode],
  );

  const nodePointerAreaPaint = useCallback(
    (node: any, color: string, ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = color;
      const w = 36,
        h = 36;
      ctx.beginPath();
      ctx.rect((node.x ?? 0) - w / 2, (node.y ?? 0) - h / 2, w, h);
      ctx.fill();
    },
    [],
  );

  const linkWidth = useCallback(
    (link: any) => {
      if (!hoverNode && !selectedNode) return 0.8;
      if (hoverNode && (link.source === hoverNode || link.target === hoverNode))
        return 1.6;
      if (
        selectedNode &&
        (link.source === selectedNode || link.target === selectedNode)
      )
        return 1.6;
      return 0.8;
    },
    [hoverNode, selectedNode],
  );

  // ---------- UI ----------
  return (
    <div
      ref={containerRef}
      className="w-full h-[97%] border rounded-md border-gray-300  bg-white overflow-hidden relative"
    >
      {error && <div className="p-2 text-red-500">Error: {error}</div>}

      <div
        style={{ width: "100%", height: "100%" }}
        className="mt-5 rounded-lg"
      >
        {!loading && (
          // @ts-expect-error Expecting this error
          <ForceGraph2D
            key={graphKey}
            ref={fgRef}
            graphData={visibleGraph}
            width={containerDimensions.width}
            height={containerDimensions.height}
            autoPauseRedraw={true}
            warmupTicks={60} // Increased for better distributed layout
            cooldownTicks={80} // Increased for better settling
            nodeRelSize={8} // Slightly larger nodes for better spacing
            linkDirectionalParticles={0}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={0.9}
            linkColor={() => "rgba(140,140,140,0.28)"}
            linkWidth={linkWidth}
            nodeCanvasObject={nodeCanvasObject}
            nodePointerAreaPaint={nodePointerAreaPaint}
            onNodeClick={handleNodeClick}
            onNodeHover={(n: NodeT | null) => setHoverNode(n)}
            // Enhanced force configuration for distributed network layout
            d3AlphaDecay={0.0228} // Slower decay for better settling
            d3VelocityDecay={0.4} // More damping for stability
            linkDistance={120} // Increased link distance for more spacing
            chargeStrength={-400} // Stronger repulsion between nodes
            centerStrength={0.1} // Weaker centering force to allow distribution
            onEngineStop={() => {
              // Auto-center when engine stops
              setTimeout(() => {
                centerGraphInContainer();
              }, 100);
              try {
                fgRef.current?.pauseAnimation();
              } catch (e) {
                /* ignore */
              }
            }}
          />
        )}
      </div>
      {/* selected node panel */}
    </div>
  );
}
