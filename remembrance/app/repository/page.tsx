"use client";

export const dynamic = "force-dynamic";

import SideBar from "../components/sidebar";
import { MemoryGraph } from "../components/memory-graph";

export default function Page() {
  return (
    <div className="w-screen h-screen flex flex-row bg-white overflow-hidden">
      <SideBar selected={1} />
      <div className="flex-1 h-full relative">
        <div className="absolute top-4 right-4 z-10 text-xs text-gray-400 tracking-wide uppercase pointer-events-none">
          Memory Graph
        </div>
        <MemoryGraph />
      </div>
    </div>
  );
}
