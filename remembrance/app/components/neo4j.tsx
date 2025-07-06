"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ForceGraph2D = dynamic(() => import("react-force-graph").then(mod => mod.ForceGraph2D), {ssr: false})

const Neo4jGraph = ({userId}: {userId: string}) => {
    const [graph, setGraph] = useState({nodes: [], links: []});

    useEffect(() => {
        fetch(`localhost:5000/user/${userId}/graph`)
            .then(res => res.json())
            .then(data => setGraph(data))
            .catch(err => console.error("Failed to fetch graph: ", err))
    }, [userId]);

    return (
        <div className="w-full h-[500px] border">
            <ForceGraph2D 
                graphData={graph}
                nodeLabel="label"
                nodeAutoColorBy="label"
                linkDirectionalArrowLength={6}
                linkDirectionalArrowRelPos={1}
            />
        </div>
    )
}

export default Neo4jGraph;