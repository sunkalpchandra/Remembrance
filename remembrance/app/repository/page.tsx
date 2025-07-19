"use client";

import { useEffect, useRef, useState } from "react";
import SideBar from "../components/sidebar";
import TreeSidebar from "../components/treeSidebar";
import { Command, MemoriesRepo, Memory, Topic } from "../lib/types";
import { poppins } from "../lib/fonts";
import { All_Commands } from "../lib/commands";
import Neo4jGraph from "../components/neo4j";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/backend/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import "aframe";
import NovelEditor from "../components/novelEditor";
import VerticalDivider from "../components/VerticalDivider";

const initialRepo: MemoriesRepo = {
  memories: {
    name: 'root',
    children: []
  }
};

function decodeHTMLEntities(str: string) {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

const commands: Command[] = All_Commands.map(v => new v());

export default function Page() {
  const [repo, setRepo] = useState(initialRepo);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [current, setCurrent] = useState<Memory | Topic | null>(null);
  const [treeSidebarWidth, setTreeSidebarWidth] = useState(12);
  const [notionPageWidth, setNotionPageWidth] = useState(40);
  const [user, setUser] = useState<User | null>(null);
  
  const [content, setContent] = useState(null);
  const [editingSummary, setEditingSummary] = useState(false);
  const [command, setCommand] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const old = useRef("");

  const mainContainerRef = useRef<HTMLDivElement | null>(null);

  // Handle resize for dividers
  const handleTreeResize = (deltaX: number) => {
    if (!mainContainerRef.current) return;
    const containerWidth = mainContainerRef.current.clientWidth;
    const deltaPercent = (deltaX / containerWidth) * 100;
    setTreeSidebarWidth((prev) => Math.max(8, Math.min(20, prev + deltaPercent)));
  };

  const handleNotionResize = (deltaX: number) => {
    if (!mainContainerRef.current) return;
    const containerWidth = mainContainerRef.current.clientWidth;
    const deltaPercent = (deltaX / containerWidth) * 100;
    const maxWidth = 100 - treeSidebarWidth - 30;
    setNotionPageWidth((prev) => Math.max(30, Math.min(maxWidth, prev + deltaPercent)));
  };

  const saveToFirestore = async (updatedRepo: MemoriesRepo) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "memoryRepos", user.uid), updatedRepo);
    } catch (error) {
      console.error("Error saving to Firestore:", error);
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
        if ('children' in children[i]) {
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
    const newMemory: Memory = {
      name: 'New Memory',
      content: '',
      topics: [],
      summary: '',
      id: user?.uid
    };

    const newRepo = { ...repo };
    
    if (current && 'children' in current) {
      (current as Topic).children.push(newMemory);
    } else {
      newRepo.memories.children.push(newMemory);
    }
    
    setRepo(newRepo);
    setCurrent(newMemory);
    saveToFirestore(newRepo);
  };

  const handleNodeSelect = (node: Memory | Topic) => {
    setCurrent(node);
    setCommand("");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            setUser(firebaseUser);
            const docRef = doc(db, "memoryRepos", firebaseUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setRepo(docSnap.data() as MemoriesRepo);
            }
        }
        }
    )
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    import('aframe');
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
                content: [
                    { type: "text", text: current.name }
                ]
            },
            ...(!('children' in current) ? [
                {
                    type: "paragraph",
                    content: [
                        { type: "text", text: (current as Memory).summary }
                    ]
                }
            ] : []),
            ...(current.content?.content || [])
        ]
    };
  };

  const graphWidth = 100 - treeSidebarWidth - notionPageWidth;

  return (
    <div className="flex w-screen h-screen flex-row items-stretch text-black bg-gray-50 overflow-hidden">
      {/* Main Sidebar */}
      <SideBar selected={1} />
      {/* Main Content Container */}
      <div className="flex-1 flex flex-row h-full" ref={mainContainerRef}>
        {/* Tree Sidebar */}
        <div 
          className="h-full bg-white border-r border-gray-200 overflow-y-auto"
          style={{ width: `${treeSidebarWidth}%` }}
        >
          <TreeSidebar
            repo={repo}
            onNodeSelect={handleNodeSelect}
            onAddMemory={handleAddMemory}
            onAddCategorization={() => {}}
            onUpdateRepo={setRepo}
            selectedNode={current}
            user={user}
          />
        </div>
        {/* Tree Sidebar Resize Handle */}
        <VerticalDivider
          onResize={handleTreeResize}
          ariaLabel="Resize tree sidebar"
        />
        {/* Notion-style Page */}
        <div className="overflow-y-auto" style={{ width: `${notionPageWidth}%` }}>
          {current ? (
            <div className="px-6 py-8">
                {/* Title - Now editable in the editor */}
                
                {/* Summary - Now editable in the editor */}
                
                {/* Editor - Combined with title and summary */}
                <div className="relative">
                  {command !== "" && (
                    <div className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg bottom-5 max-h-60 overflow-y-auto">
                      {commands.map((e: Command, i) => {
                        const name = "/" + e.name;
                        if (!name.toLowerCase().includes(command.split(" ")[0].toLowerCase())) {
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
                  
                  <div onKeyDown={(e) => {
                    let indices = [];
                    for (let i = 0; i < commands.length; i++) {
                      if (("/" + commands[i].name).toLowerCase().includes(command.split(" ")[0].toLowerCase())) {
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
                      setCommandIndex(indices[(indicesIndex + 1) % indices.length]);
                    }

                    if ((e.key === "Enter" || e.key === "Tab") && command !== "" && (!command.includes(" "))) {
                      e.stopPropagation();
                      e.preventDefault();
                      let selectedCommand = commands[commandIndex];
                      let add = ("/" + selectedCommand.name).substring(command.length);
                      setCommand("");
                    }
                  }}>
                    <NovelEditor
                      key={current.id || current.name}
                      content={{
                        type: "doc",
                        content: [
                          {
                            type: "heading",
                            attrs: { level: 1 },
                            content: [
                              { type: "text", text: current.name }
                            ]
                          },
                          ...(!('children' in current) ? [
                            {
                              type: "paragraph",
                              content: [
                                { type: "text", text: (current as Memory).summary }
                              ]
                            }
                          ] : []),
                          ...(current.content?.content || [])
                        ]
                      }}
                      onUpdate={(content) => {
                        if (current) {
                          // Extract title and summary from content
                          const titleNode = content.content?.[0];
                          const summaryNode = !('children' in current) ? content.content?.[1] : null;
                          const editorContent = {
                            content: content.content?.slice('children' in current ? 1 : 2)
                          };

                          const copy = { ...current };
                          copy.name = titleNode?.content?.[0]?.text || current.name;
                          
                          if (!('children' in current) && summaryNode) {
                            (copy as Memory).summary = summaryNode.content?.[0]?.text || (current as Memory).summary;
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
                  <p className="text-2xs">Or create a new memory to get started</p>
                </div>
              </div>
            )}
          </div>
        {/* Notion Page Resize Handle */}
        <VerticalDivider
          onResize={handleNotionResize}
          ariaLabel="Resize notion page"
        />
        {/* Graph View */}
        <div 
          className="h-full bg-white overflow-hidden"
          style={{ width: `${graphWidth}%` }}
        >
          <Neo4jGraph 
            userId={user.uid} 
            onNodeClick={(node) => {
              if (node?.properties?.content) {
                setSelectedNode(node.properties.content);
              } else if (node?.properties?.name) {
                setSelectedNode(`User: ${node.properties.name}`);
              } else {
                setSelectedNode("No content found for this node.");
              }
            }}
          />
        </div>
        {/* Selected Node Popup */}
        {selectedNode && (
          <div className="absolute bottom-10 right-10 max-w-md p-4 bg-white shadow-xl border border-gray-200 rounded-lg z-50">
            <div className="flex justify-between items-start mb-2">
              <h2 className="font-semibold text-lg">Selected Node</h2>
              <button 
                onClick={() => setSelectedNode(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedNode}</p>
          </div>
        )}
      </div>
    </div>
  );
}