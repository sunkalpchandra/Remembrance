"use client";

import { useContext, useEffect, useRef, useState } from "react";
import TreeSidebar from "../components/treeSidebar";
import { Command, MemoriesRepo, Memory, Topic } from "../lib/types";
import { All_Commands } from "../lib/commands";
import Neo4jGraph from "../components/neo4j";
import { UserContext } from "../components/usercontext";
import NovelEditor from "../components/novelEditor";

const initialRepo: MemoriesRepo = {
  memories: {
    name: "",
    children: [],
  },
};

const commands: Command[] = All_Commands.map((v) => new v());

export default function Page() {
  const [repo, setRepo] = useState(initialRepo);
  const [current, setCurrent] = useState<Memory | Topic | null>(null);
  // Pixel widths so the resize math is exact (no percentage overflow)
  const [treeSidebarWidth, setTreeSidebarWidth] = useState(220);
  const [graphWidth, setGraphWidth] = useState(340);
  const [graphKey, setGraphKey] = useState(0);
  const user = useContext(UserContext);

  const [command, setCommand] = useState("");

  // When repo refreshes (e.g. background AI fetch), update current if a fresher
  // version of the same memory is now available (matched by id)
  useEffect(() => {
    if (!current || "children" in current) return;
    const id = (current as Memory).id;
    if (!id) return;
    const findById = (children: (Memory | Topic)[]): Memory | null => {
      for (const c of children) {
        if ("children" in c) { const found = findById((c as Topic).children); if (found) return found; }
        else if ((c as Memory).id === id) return c as Memory;
      }
      return null;
    };
    const fresh = findById(repo.memories.children);
    if (fresh && fresh !== current) setCurrent(fresh);
  }, [repo]);
  const [commandIndex, setCommandIndex] = useState(0);

  const mainContainerRef = useRef<HTMLDivElement | null>(null);
  const treeResizeRef = useRef<HTMLDivElement | null>(null);
  const notionResizeRef = useRef<HTMLDivElement | null>(null);

  const saveRepoLocally = async (updatedRepo: MemoriesRepo) => {
    if (!user || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        `memoryRepo:${user.uid}`,
        JSON.stringify(updatedRepo),
      );
    } catch (error) {
      console.error("Error saving memory repo:", error);
    }
  };

  function GetPath(mem: Memory | Topic) {
    function isTopic(obj: any): obj is Topic {
      return obj && Array.isArray(obj.children);
    }

    function Recurse(on: Topic): null | Array<Topic | Memory | any> {
      for (let v of on.children) {
        if (v === mem) {
          return [v];
        }
        if (isTopic(v)) {
          let out = Recurse(v);
          if (out != null) {
            return [v, ...out];
          }
        }
      }
      return null;
    }

    for (let v of repo.memories.children) {
      if (v === mem) {
        return [v];
      }
      if (isTopic(v)) {
        let out = Recurse(v);
        if (out != null) {
          return [v, ...out];
        }
      }
    }
    return null;
  }

  const syncMemoryToDB = async (mem: Memory): Promise<string | null> => {
    if (mem.aiGenerated) return null;
    try {
      const isUUID = /^[0-9a-f-]{36}$/.test(mem.id ?? "");
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: isUUID ? mem.id : undefined,
          name: mem.name,
          summary: mem.summary ?? "",
          content: mem.content ?? {},
        }),
      });
      const data = await res.json();
      setGraphKey((k) => k + 1);
      return data.id ?? null;
    } catch (e) {
      console.error("Failed to sync memory to DB:", e);
      return null;
    }
  };

  const updateRepo = (current: Memory | Topic, newValue: Memory | Topic) => {
    const updateInChildren = (children: (Memory | Topic)[]): boolean => {
      for (let i = 0; i < children.length; i++) {
        if (children[i] === current) {
          children[i] = newValue;
          return true;
        }
        if ("children" in children[i]) {
          if (updateInChildren((children[i] as Topic).children)) {
            return true;
          }
        }
      }
      return false;
    };

    const newRepo = { ...repo };
    updateInChildren(newRepo.memories.children);
    setRepo(newRepo);
    saveRepoLocally(newRepo);

    // Sync to DB so the graph includes repo-created memories
    if (!("children" in newValue)) {
      syncMemoryToDB(newValue as Memory);
    }
  };

  const handleAddMemory = () => {
    const newRepo = { ...repo };
    const siblings =
      current && "children" in current
        ? current.children
        : newRepo.memories.children;
    // Pick the lowest free "Untitled"/"Untitled N" name among siblings
    const taken = new Set(
      siblings
        .map((e) => e.name.trim())
        .filter((n) => n === "Untitled" || /^Untitled \d+$/.test(n)),
    );
    let name = "Untitled";
    for (let n = 2; taken.has(name); n++) name = `Untitled ${n}`;
    const randomId = new Uint8Array(32);
    crypto.getRandomValues(randomId);
    const newMemory: Memory = {
      name,
      content: " ",
      topics: [],
      summary: "",
      ownerID: user?.uid,
      id: btoa(String.fromCharCode(...randomId)),
    };
    if (current && "children" in current) {
      (current as Topic).children.push(newMemory);
    } else {
      newRepo.memories.children.push(newMemory);
    }
    setRepo(newRepo);
    setCurrent(newMemory);
    saveRepoLocally(newRepo);
    syncMemoryToDB(newMemory).then((dbId) => {
      if (!dbId) return;
      // Store the real DB UUID so future edits update rather than re-insert
      newMemory.id = dbId;
      saveRepoLocally({ ...newRepo });
    });
  };

  const handleNodeSelect = (node: Memory | Topic) => {
    // If it's a Topic (folder/collection), don't set it as current to show empty state
    if ("children" in node) {
      setCurrent(null);
    } else {
      // It's a Memory, set it as current
      setCurrent(node);
    }
    setCommand("");
  };

  // Check if repository is empty
  const isRepositoryEmpty = () => {
    return !repo.memories.children || repo.memories.children.length === 0;
  };

  // Check if we should show empty state
  const shouldShowEmptyState = () => {
    return (
      !current || (current && "children" in current) || isRepositoryEmpty()
    );
  };

  // Setup resize handlers (pixel-based)
  useEffect(() => {
    const handleTreeResize = (e: MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = treeSidebarWidth;
      const onMove = (e: MouseEvent) => {
        const next = Math.max(
          160,
          Math.min(400, startWidth + (e.clientX - startX)),
        );
        setTreeSidebarWidth(next);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };

    const handleGraphResize = (e: MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = graphWidth;
      const onMove = (e: MouseEvent) => {
        // dragging the left edge of the graph — moving right shrinks graph
        const next = Math.max(
          200,
          Math.min(600, startWidth - (e.clientX - startX)),
        );
        setGraphWidth(next);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };

    const treeEl = treeResizeRef.current;
    const notionEl = notionResizeRef.current;
    if (treeEl) treeEl.addEventListener("mousedown", handleTreeResize);
    if (notionEl) notionEl.addEventListener("mousedown", handleGraphResize);

    return () => {
      if (treeEl) treeEl.removeEventListener("mousedown", handleTreeResize);
      if (notionEl)
        notionEl.removeEventListener("mousedown", handleGraphResize);
    };
  }, [treeSidebarWidth, graphWidth]);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    const AI_CACHE_KEY = `aiMemories:${user.uid}`;

    let localRepo: MemoriesRepo = initialRepo;
    const raw = window.localStorage.getItem(`memoryRepo:${user.uid}`);
    if (raw) {
      try {
        localRepo = JSON.parse(raw) as MemoriesRepo;
      } catch (e) {
        console.error("Failed to load memory repo:", e);
      }
    }

    const buildMerged = (aiMems: Memory[], base: MemoriesRepo): MemoriesRepo => {
      const preserved = (base.memories.children || []).filter(
        (c) => !("children" in c && (c as Topic).name === "AI Memories"),
      );
      // Collect all IDs already tracked locally so manually-created memories
      // don't also appear under AI Memories
      const localIds = new Set<string>();
      const collectIds = (children: (Memory | Topic)[]) => {
        for (const c of children) {
          if ("children" in c) collectIds((c as Topic).children);
          else if ((c as Memory).id) localIds.add((c as Memory).id!);
        }
      };
      collectIds(preserved);
      const onlyAI = aiMems.filter((m) => !localIds.has(m.id!));
      const aiTopic: Topic = { id: "ai-memories", name: "AI Memories", children: onlyAI };
      return {
        memories: {
          ...base.memories,
          children: onlyAI.length > 0 ? [aiTopic, ...preserved] : preserved,
        },
      };
    };

    // Show cached AI memories instantly
    const cachedAI = window.localStorage.getItem(AI_CACHE_KEY);
    if (cachedAI) {
      try {
        const aiMems: Memory[] = JSON.parse(cachedAI);
        setRepo(buildMerged(aiMems, localRepo));
      } catch {}
    } else {
      setRepo(localRepo);
    }

    // Fetch AI-saved memories from DB and merge as an "AI Memories" topic
    (async () => {
      try {
        const res = await fetch("/api/memories");
        if (!res.ok) return;
        const data = await res.json();
        const aiMems: Memory[] = (data.memories || []).map((m: any) => ({
          id: m.id,
          ownerID: m.ownerID,
          name: m.name,
          summary: m.summary,
          content: m.content && typeof m.content === "object" ? m.content : {},
          topics: m.topics || [],
          aiGenerated: true,
        }));

        try { window.localStorage.setItem(AI_CACHE_KEY, JSON.stringify(aiMems)); } catch {}
        setRepo(buildMerged(aiMems, localRepo));
      } catch (e) {
        console.error("Failed to fetch AI memories:", e);
        setRepo(localRepo);
      }
    })();
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex w-screen h-screen flex-row items-stretch text-black bg-white overflow-hidden">
      {/* Main Content Container — no global sidebar on this page */}
      <div
        className="flex-1 flex flex-row h-full min-w-0"
        ref={mainContainerRef}
      >
        {/* Tree Sidebar — fixed pixel width */}
        <div
          className="h-full bg-gray-50 overflow-y-auto flex-shrink-0 border-r border-gray-200"
          style={{ width: treeSidebarWidth }}
        >
          <TreeSidebar
            repo={repo}
            onNodeSelect={handleNodeSelect}
            onAddMemory={handleAddMemory}
            onUpdateRepo={setRepo}
            selectedNode={current}
            user={user}
            onMemoryDeleted={() => setGraphKey((k) => k + 1)}
          />
        </div>

        {/* Tree resize handle */}
        <div
          ref={treeResizeRef}
          className="w-1 bg-gray-200 hover:bg-gray-400 cursor-col-resize transition-colors flex-shrink-0"
        />

        {/* Editor — takes all remaining space */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {current && !("children" in current) && !shouldShowEmptyState() ? (
            <div className="px-6 py-8">
              {/* Title - Now editable in the editor */}
              {/* Summary - Now editable in the editor */}
              {/* Editor - Combined with title and summary */}
              <div className="relative">
                {command !== "" && (
                  <div className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg bottom-5 max-h-60 overflow-y-auto">
                    {commands.map((e: Command, i) => {
                      const name = "/" + e.name;
                      if (
                        !name
                          .toLowerCase()
                          .includes(command.split(" ")[0].toLowerCase())
                      ) {
                        return null;
                      }
                      return (
                        <div
                          key={i}
                          className={`flex flex-col p-2 hover:bg-gray-50 cursor-pointer ${
                            i === commandIndex ? "bg-gray-100" : ""
                          }`}
                        >
                          <h3 className="font-medium text-sm">{e.name}</h3>
                          <p className="text-xs text-gray-600">{e.summary}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div
                  onKeyDown={(e) => {
                    let indices = [];
                    for (let i = 0; i < commands.length; i++) {
                      if (
                        ("/" + commands[i].name)
                          .toLowerCase()
                          .includes(command.split(" ")[0].toLowerCase())
                      ) {
                        indices.push(i);
                      }
                    }

                    if (indices.length === 0) {
                      setCommandIndex(0);
                      return;
                    }

                    let indicesIndex = indices.indexOf(commandIndex);
                    if (indicesIndex === -1) {
                      setCommandIndex(indices[0]);
                      return;
                    }

                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      let next = indicesIndex - 1;
                      if (next < 0) {
                        setCommandIndex(indices[indices.length - 1]);
                      } else {
                        setCommandIndex(indices[next]);
                      }
                    }

                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setCommandIndex(
                        indices[(indicesIndex + 1) % indices.length],
                      );
                    }

                    if (
                      (e.key === "Enter" || e.key === "Tab") &&
                      command !== "" &&
                      !command.includes(" ")
                    ) {
                      e.stopPropagation();
                      e.preventDefault();
                      setCommand("");
                    }
                  }}
                >
                  <h1 className="text-gray-400 font-bold text-sm truncate">
                    {(() => {
                      const path = current ? GetPath(current) : null;
                      const segs = ["Repository"];
                      if (path && path.length > 1) {
                        segs.push(path[0].name || "Untitled");
                      }
                      segs.push(current?.name || "Untitled");
                      return segs.join(" › ");
                    })()}
                  </h1>
                  {/* Editor */}
                  <NovelEditor
                    key={current.id || current.name}
                    content={{
                      type: "doc",
                      content: [
                        {
                          type: "heading",
                          attrs: { level: 1 },
                          content: [
                            { type: "text", text: current.name || "Unamed" },
                          ],
                        },
                        ...(!("children" in current)
                          ? [
                              {
                                type: "paragraph",
                                content: [
                                  {
                                    type: "text",
                                    text: (current as Memory).summary || " ",
                                  },
                                ],
                              },
                            ]
                          : []),
                        ...(current.content?.content || []),
                      ],
                    }}
                    onUpdate={(content) => {
                      if (current) {
                        // Extract title and summary from content
                        const titleNode = content.content?.[0];
                        const summaryNode = !("children" in current)
                          ? content.content?.[1]
                          : null;
                        const editorContent = {
                          content: content.content?.slice(
                            "children" in current ? 1 : 2,
                          ),
                        };

                        const copy = { ...current };
                        copy.name =
                          titleNode?.content?.[0]?.text || current.name;
                        if (!("children" in current) && summaryNode) {
                          (copy as Memory).summary =
                            summaryNode.content?.[0]?.text ||
                            (current as Memory).summary;
                        }
                        copy.content = editorContent;
                        setCurrent(copy);
                        updateRepo(current, copy);
                      }
                    }}
                    onCommandKeyDown={(e) => {
                      if (e.key === "/") {
                        setCommand("/");
                      }
                    }}
                    className="min-h-[calc(100vh-4rem)]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
              <p className="text-sm text-gray-500">Select a memory to view</p>
              <button
                onClick={handleAddMemory}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors duration-75"
              >
                Add Memory
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Graph resize handle (sits between editor and graph) */}
      <div
        ref={notionResizeRef}
        className="w-1 bg-gray-200 hover:bg-gray-400 cursor-col-resize transition-colors flex-shrink-0"
      />

      {/* Graph View — fixed pixel width */}
      <div
        className="h-full overflow-hidden flex-shrink-0 flex flex-col border-l border-gray-200"
        style={{ width: graphWidth }}
      >
        {/*<div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">Graph</span>
          <button
            onClick={() => setGraphKey((k) => k + 1)}
            className="text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-2 py-0.5 rounded transition-colors"
            title="Refresh graph"
          >
            Refresh
          </button>
        </div>*/}
        <div className="flex-1 overflow-hidden">
          <Neo4jGraph key={graphKey} />
        </div>
      </div>
    </div>
  );
}
