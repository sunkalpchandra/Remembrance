"use client"
import { useEffect, useRef, useState } from "react";
import SideBar from "../components/sidebar";
import TreeSidebar from "../components/treeSidebar";
import { Command, MemoriesRepo, Memory, Topic } from "../lib/types";
import { poppins } from "../lib/fonts";
import Editor from "../components/mdEditor";
import { MDXEditorMethods } from "@mdxeditor/editor";
import { All_Commands } from "../lib/commands";
import Neo4jGraph from "../components/neo4j";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/backend/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import "aframe";

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
  
  const editorRef = useRef<MDXEditorMethods | null>(null);
  const [editingSummary, setEditingSummary] = useState(false);
  const [command, setCommand] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const old = useRef("");

  const mainContainerRef = useRef<HTMLDivElement | null>(null);
  const treeResizeRef = useRef<HTMLDivElement | null>(null);
  const notionResizeRef = useRef<HTMLDivElement | null>(null);

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
    
    function Recurse(on: Topic): null | Array<Topic | Memory> {
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
      summary: 'New memory summary'
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

  // Setup resize handlers
  useEffect(() => {
    const handleTreeResize = (e: MouseEvent) => {
      const startX = e.clientX;
      const startWidth = treeSidebarWidth;
      
      const handleMouseMove = (e: MouseEvent) => {
        if (!mainContainerRef.current) return;
        const containerWidth = mainContainerRef.current.clientWidth;
        const deltaX = e.clientX - startX;
        const deltaPercent = (deltaX / containerWidth) * 100;
        const newWidth = Math.max(8, Math.min(20, startWidth + deltaPercent));
        setTreeSidebarWidth(newWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const handleNotionResize = (e: MouseEvent) => {
      const startX = e.clientX;
      const startWidth = notionPageWidth;
      
      const handleMouseMove = (e: MouseEvent) => {
        if (!mainContainerRef.current) return;
        const containerWidth = mainContainerRef.current.clientWidth;
        const deltaX = e.clientX - startX;
        const deltaPercent = (deltaX / containerWidth) * 100;
        const maxWidth = 100 - treeSidebarWidth - 30;
        const newWidth = Math.max(30, Math.min(maxWidth, startWidth + deltaPercent));
        setNotionPageWidth(newWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    if (treeResizeRef.current) {
      treeResizeRef.current.addEventListener('mousedown', handleTreeResize);
    }
    if (notionResizeRef.current) {
      notionResizeRef.current.addEventListener('mousedown', handleNotionResize);
    }

    return () => {
      if (treeResizeRef.current) {
        treeResizeRef.current.removeEventListener('mousedown', handleTreeResize);
      }
      if (notionResizeRef.current) {
        notionResizeRef.current.removeEventListener('mousedown', handleNotionResize);
      }
    };
  }, [treeSidebarWidth, notionPageWidth]);

  useEffect(() => {
    if (editorRef.current && current) {
      editorRef.current.setMarkdown(current?.content || "");
    }
  }, [current]);

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
        <div 
          ref={treeResizeRef}
          className="w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
        />

        {/* Notion-style Page */}
        <div 
          className="h-full flex flex-col bg-white overflow-hidden"
          style={{ width: `${notionPageWidth}%` }}
        >
          {/* Page Content */}
          <div className="flex-1 overflow-y-auto">
            {current ? (
              <div className="px-6 py-8">
                {/* Title */}
                <h1 className={`text-3xl font-bold mb-6 ${poppins.className}`}>
                  {current.name}
                </h1>
                
                {/* Summary */}
                {!('children' in current) && (
                  <div 
                    className="w-full bg-gray-50 rounded-lg p-3 mb-6 flex items-start gap-2 cursor-pointer"
                    onDoubleClick={() => setEditingSummary(!editingSummary)}
                  >
                    {editingSummary ? (
                      <input
                        type="text"
                        value={(current as Memory).summary}
                        onChange={(e) => {
                          const copy = { ...current } as Memory;
                          copy.summary = e.target.value;
                          setCurrent(copy);
                          updateRepo(current, copy);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setEditingSummary(false);
                          }
                        }}
                        onBlur={() => setEditingSummary(false)}
                        className="flex-1 bg-transparent outline-none text-sm"
                        autoFocus
                      />
                    ) : (
                      <p className="text-gray-600 flex-1 text-sm">
                        {(current as Memory).summary}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Editor */}
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
                  
                  <div 
                    onKeyDown={(e) => {
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
                        editorRef.current?.insertMarkdown(add + " ");
                        setCommand("");
                      }
                    }}
                  >
                    <Editor
                      editorRef={editorRef}
                      change={(e) => {
                        if (e.length > old.current.length) {
                          let added = decodeHTMLEntities(e.substring(old.current.length));
                          if (command !== "") {
                            setCommand(command + added);
                          } else {
                            if (added.includes("/")) {
                              setCommand(added.substring(added.indexOf("/")));
                            }
                          }
                        } else {
                          let deleted = old.current.substring(e.length);
                          if (command !== "" && deleted.includes("/")) {
                            setCommand("");
                          } else if (command !== "") {
                            setCommand(command.substring(0, command.length - deleted.length));
                          }
                        }
                        
                        if (current) {
                          let copy = { ...current };
                          copy.content = e;
                          setCurrent(copy);
                          updateRepo(current, copy);
                        }
                        old.current = e;
                      }}
                      markdown={current?.content || ""}
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
        </div>

        {/* Notion Page Resize Handle */}
        <div 
          ref={notionResizeRef}
          className="w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
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
  );
}