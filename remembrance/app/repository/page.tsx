"use client";

export const dynamic = "force-dynamic";

import { useContext, useEffect, useRef, useState } from "react";
import SideBar from "../components/sidebar";
import TreeSidebar from "../components/treeSidebar";
import { Command, MemoriesRepo, Memory, Topic } from "../lib/types";
import { poppins } from "../lib/fonts";
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

function decodeHTMLEntities(str: string) {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

const commands: Command[] = All_Commands.map((v) => new v());

export default function Page() {
  const [repo, setRepo] = useState(initialRepo);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [current, setCurrent] = useState<Memory | Topic | null>(null);
  const [treeSidebarWidth, setTreeSidebarWidth] = useState(20);
  const [notionPageWidth, setNotionPageWidth] = useState(45);
  const user = useContext(UserContext);

  const [content, setContent] = useState(null);
  const [editingSummary, setEditingSummary] = useState(false);
  const [command, setCommand] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const old = useRef("");

  const mainContainerRef = useRef<HTMLDivElement | null>(null);
  const treeResizeRef = useRef<HTMLDivElement | null>(null);
  const notionResizeRef = useRef<HTMLDivElement | null>(null);

  const saveToFirestore = async (updatedRepo: MemoriesRepo) => {
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
    saveToFirestore(newRepo);
  };

  const handleAddMemory = () => {
    const newRepo = { ...repo };
    let nameAddition = 0;
    let check =
      current && "children" in current
        ? current.children
        : newRepo.memories.children;
    check = check.filter((e) => {
      return e.name.match(/Untitled [1-9]+/) || e.name.trim() == "Untitled";
    });
    //if lag gets bad this can be rewritten to use a sort and be much more time efficent
    for (let i = 0; i < check.length; i++) {
      let value = `Untitled ${nameAddition == 0 ? "" : nameAddition + 1}`;
      if (check[i].name == value) {
        nameAddition++;
        i = 0;
      }
    }
    const randomId = new Uint8Array(32);
    crypto.getRandomValues(randomId);
    const newMemory: Memory = {
      name: `Untitled ${nameAddition == 0 ? "" : nameAddition + 1}`,
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
    saveToFirestore(newRepo);
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

  // Setup resize handlers
  useEffect(() => {
    const handleTreeResize = (e: MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = treeSidebarWidth;
      const handleMouseMove = (e: MouseEvent) => {
        if (!mainContainerRef.current) return;
        const containerWidth = mainContainerRef.current.clientWidth;
        const deltaX = e.clientX - startX;
        const deltaPercent = (deltaX / containerWidth) * 100;
        const newWidth = Math.max(12, Math.min(35, startWidth + deltaPercent));
        setTreeSidebarWidth(newWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    const handleNotionResize = (e: MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = notionPageWidth;

      const handleMouseMove = (e: MouseEvent) => {
        if (!mainContainerRef.current) return;
        const containerWidth = mainContainerRef.current.clientWidth;
        const deltaX = e.clientX - startX;
        const deltaPercent = (deltaX / containerWidth) * 100;
        const maxWidth = 100 - treeSidebarWidth - 20;
        const newWidth = Math.max(
          25,
          Math.min(maxWidth, startWidth + deltaPercent),
        );
        setNotionPageWidth(newWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    const treeEl = treeResizeRef.current;
    const notionEl = notionResizeRef.current;
    if (treeEl) treeEl.addEventListener("mousedown", handleTreeResize);
    if (notionEl) notionEl.addEventListener("mousedown", handleNotionResize);

    return () => {
      if (treeEl) treeEl.removeEventListener("mousedown", handleTreeResize);
      if (notionEl) notionEl.removeEventListener("mousedown", handleNotionResize);
    };
  }, [treeSidebarWidth, notionPageWidth]);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    let localRepo: MemoriesRepo = initialRepo;
    const raw = window.localStorage.getItem(`memoryRepo:${user.uid}`);
    if (raw) {
      try {
        localRepo = JSON.parse(raw) as MemoriesRepo;
      } catch (e) {
        console.error("Failed to load memory repo:", e);
      }
    }

    // Fetch AI-saved memories from DB and merge as an "AI Memories" topic
    (async () => {
      try {
        const res = await fetch("/api/memories");
        if (!res.ok) {
          setRepo(localRepo);
          return;
        }
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

        // Merge: keep existing children except a prior "AI Memories" topic, then append fresh one
        const preserved = (localRepo.memories.children || []).filter(
          (c) => !("children" in c && (c as Topic).name === "AI Memories"),
        );

        const aiTopic: Topic = {
          id: "ai-memories",
          name: "AI Memories",
          children: aiMems,
        };

        const merged: MemoriesRepo = {
          memories: {
            ...localRepo.memories,
            children: aiMems.length > 0 ? [aiTopic, ...preserved] : preserved,
          },
        };

        setRepo(merged);
      } catch (e) {
        console.error("Failed to fetch AI memories:", e);
        setRepo(localRepo);
      }
    })();
  }, [user]);

  useEffect(() => {
    import("aframe");
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const createEditorContent = (current: Memory | Topic | any) => {
    if (!current) return { type: "doc", content: [] };

    return {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: current.name }],
        },
        ...(!("children" in current)
          ? [
              {
                type: "paragraph",
                content: [{ type: "text", text: (current as Memory).summary }],
              },
            ]
          : []),
        ...(current.content?.content || []),
      ],
    };
  };

  const graphWidth = Math.max(20, 100 - treeSidebarWidth - notionPageWidth);

  return (
    <div className="flex w-screen h-screen flex-row items-stretch text-black bg-white overflow-hidden">
      {/* Main Sidebar */}
      <SideBar selected={1} />
      {/* Main Content Container */}
      <div className="flex-1 flex flex-row h-full min-w-0" ref={mainContainerRef}>
        {/* Tree Sidebar */}
        <div
          className="h-full bg-white overflow-y-auto border-r border-gray-200"
          style={{ width: `${treeSidebarWidth}%` }}
        >
          <TreeSidebar
            repo={repo}
            onNodeSelect={handleNodeSelect}
            onAddMemory={handleAddMemory}
            onUpdateRepo={setRepo}
            selectedNode={current}
            user={user}
          />
        </div>

        {/* Tree Sidebar Resize Handle */}
        <div
          ref={treeResizeRef}
          className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors flex-shrink-0"
        />

        {/* Notion-style Page */}
        <div
          className="overflow-y-auto min-w-0"
          style={{ width: `${notionPageWidth}%` }}
        >
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
                      let selectedCommand = commands[commandIndex];
                      let add = ("/" + selectedCommand.name).substring(
                        command.length,
                      );
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
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center text-gray-500">
                <p className="text-xs mb-1">Select a memory or topic to view</p>
                <p className="text-2xs">
                  Or create a new memory to get started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Graph View */}
      <div
        className="h-full overflow-hidden flex-shrink-0 flex flex-col border-l border-gray-200"
        style={{ width: `${graphWidth}%` }}
      >
        <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Memory Graph</span>
        </div>
        <div className="flex-1 relative overflow-hidden">
          <Neo4jGraph
            userId={user.uid}
            onNodeClick={(node) => {
              const content =
                node?.content ||
                node?.properties?.content ||
                (node?.label ? node.label : null);
              setSelectedNode(content ?? "No content for this node.");
            }}
          />

          {/* Selected Node Panel — inset inside graph column */}
          {selectedNode && (
            <div className="absolute bottom-4 left-4 right-4 max-h-40 overflow-y-auto bg-white/95 backdrop-blur-sm shadow-lg border border-gray-200 rounded-xl p-3 z-50">
              <div className="flex justify-between items-start gap-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Selected</p>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-gray-700 text-lg leading-none flex-shrink-0"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap break-words">
                {selectedNode}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
