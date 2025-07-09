"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ForceGraph2D = dynamic(() => import("react-force-graph").then(mod => mod.ForceGraph2D), {ssr: false})

const Neo4jGraph = ({userId, onNodeClick}: {userId: string; onNodeClick?: (node: any) => void;}) => {
    const [graph, setGraph] = useState({nodes: [], links: []});

    useEffect(() => {
        fetch(`http://localhost:5000/user/${userId}/graph`)
            .then(res => res.json())
            .then(data => setGraph(data))
            .catch(err => console.error("Failed to fetch graph: ", err))
    }, [userId]);

    return (
        <div className="w-full h-[500px] border">
            <ForceGraph2D 
                graphData={graph}
                // nodeLabel={(node: any) => node.label}
                nodeAutoColorBy="label"
                linkDirectionalArrowLength={6}
                linkDirectionalArrowRelPos={1}
                onNodeClick={onNodeClick}
                nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = node.label || node.id;
                    const fontSize = 14 / globalScale;

                    // Draw default circle node (you can customize color/radius here)
                    const nodeRadius = 8;
                    ctx.beginPath();
                    ctx.arc(node.x as number, node.y as number, nodeRadius, 0, 2 * Math.PI, false);
                    ctx.fillStyle = node.color || 'lightblue'; // fallback color
                    ctx.fill();

                    // Draw label background for better readability
                    const textWidth = ctx.measureText(label).width;
                    const padding = 2;
                    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
                    ctx.fillRect(node.x as number - textWidth / 2 - padding, node.y as number - fontSize / 2 - padding, textWidth + padding * 2, fontSize + padding * 2);

                    // Draw label text
                    ctx.font = `${fontSize}px Sans-Serif`;
                    ctx.fillStyle = "#333";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(label, node.x as number, node.y as number);
                }}

            />
        </div>
    )
}

export default Neo4jGraph;