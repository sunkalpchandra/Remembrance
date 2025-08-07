"use client";
import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";

const ForceGraph2D = dynamic(() => import("react-force-graph").then(mod => mod.ForceGraph2D), { ssr: false });

// Color palette generation function
const generateColorPalette = (count: number) => {
  const colors = [];
  const hueStep = 360 / count;
  for (let i = 0; i < count; i++) {
    const hue = i * hueStep;
    colors.push(`hsl(${hue}, 70%, 60%)`); // Vibrant colors
  }
  return colors;
};

const Neo4jGraph = ({ userId, onNodeClick }: { userId: string; onNodeClick?: (node: any) => void }) => {
    const [graph, setGraph] = useState({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hoverNode, setHoverNode] = useState(null);

    // Generate colors for nodes
    const nodeColors = useMemo(() => {
        return generateColorPalette(graph.nodes.length);
    }, [graph.nodes.length]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        
        fetch(`http://localhost:5001/user/${userId}/graph`)
            .then(res => {
                if (!res.ok) throw new Error("Failed to load graph");
                return res.json();
            })
            .then(data => {
                if (!data.nodes || !data.links) {
                    throw new Error("Invalid graph data format");
                }
                // Assign colors to nodes based on their index
                const coloredNodes = data.nodes.map((node: any, index: any) => ({
                    ...node,
                    color: nodeColors[index % nodeColors.length]
                }));
                setGraph({ nodes: coloredNodes, links: data.links });
                setLoading(false);
            })
            .catch(err => {
                console.error("Graph load error:", err);
                setError(err.message);
                setLoading(false);
            });
    }, [userId, nodeColors]);

    useEffect(() => {
        const syncAndFetch = async () => {
            setLoading(true);
            setError(null);

            try {
            // First sync memories to Neo4j
            const syncRes = await fetch(`http://localhost:5001/user/${userId}/populate_graph`, {
                method: "POST",
            });
            if (!syncRes.ok) throw new Error("Failed to sync memories");

            // Then fetch graph
            const graphRes = await fetch(`http://localhost:5001/user/${userId}/graph`);
            if (!graphRes.ok) throw new Error("Failed to load graph");

            const data = await graphRes.json();

            const coloredNodes = data.nodes.map((node: any, index: any) => ({
                ...node,
                color: nodeColors[index % nodeColors.length],
            }));

            setGraph({ nodes: coloredNodes, links: data.links });
            } catch (err: any) {
            console.error("Graph load error:", err);
            setError(err.message);
            } finally {
            setLoading(false);
            }
        };

    syncAndFetch();
    }, [userId, nodeColors]);



    return (
        <div className="w-full h-[500px] border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                <h3 className="font-medium text-gray-800 text-sm flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                    Memory Connections
                </h3>
            </div>
            <ForceGraph2D 
                graphData={graph}
                nodeAutoColorBy="label" // Remove this since we're manually coloring
                linkDirectionalArrowLength={5}
                linkDirectionalArrowRelPos={0.9}
                linkDirectionalParticles={1}
                linkDirectionalParticleSpeed={0.003}
                linkColor={() => "rgba(180, 180, 180, 0.4)"}
                linkWidth={link => hoverNode && (link.source === hoverNode || link.target === hoverNode) ? 2 : 1}
                linkLineDash={[3, 2]}
                onNodeHover={(node: any) => setHoverNode(node)}
                onNodeClick={onNodeClick}
                nodeRelSize={8}
                nodeVal={node => hoverNode === node ? 12 : 8}
                nodeColor={node => hoverNode === node ? '#6366f1' : node.color} // Use assigned color
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const label = node.label || node.id;
                    const nodeRadius = hoverNode === node ? 8 : 6;
                    const glow = hoverNode === node;

                    // Node glow effect
                    if (glow) {
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, nodeRadius * 1.8, 0, 2 * Math.PI, false);
                        ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
                        ctx.fill();
                    }

                    // Draw node
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
                    ctx.fillStyle = hoverNode === node ? '#6366f1' : node.color;
                    ctx.fill();

                    // White border
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    // Draw label only if zoomed in enough
                    if (globalScale > 0.5) {
                        const fontSize = Math.min(12, 12 / globalScale);
                        const textWidth = ctx.measureText(label).width;
                        const padding = 4;
                        
                        // Label background
                        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
                        ctx.beginPath();
                        ctx.roundRect(
                            node.x - textWidth/2 - padding,
                            node.y - fontSize/2 - padding - nodeRadius - 4,
                            textWidth + padding*2,
                            fontSize + padding*2,
                            6
                        );
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        
                        // Label text
                        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
                        ctx.fillStyle = "#111827";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(label, node.x, node.y - nodeRadius - fontSize/2 - 4);
                    }
                }}
                nodePointerAreaPaint={(node, color, ctx) => {
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc((node as any).x, (node as any).y, 12, 0, 2 * Math.PI);
                    ctx.fill();
                }}
            />
        </div>
    );
};

export default Neo4jGraph;