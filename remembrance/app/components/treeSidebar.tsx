"use client"
import { useState, useEffect } from "react";
import { MemoriesRepo, Memory, Topic } from "../lib/types";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/backend/firebaseConfig";
import { User } from "firebase/auth";
import { IoIosArrowDown, IoIosArrowForward } from "react-icons/io";
import { BiPencil, BiTrash } from "react-icons/bi";

interface TreeSidebarProps {
  repo: MemoriesRepo;
  onNodeSelect: (node: Memory | Topic) => void;
  onAddMemory: () => void;
  onAddCategorization: () => void;
  onUpdateRepo: (repo: MemoriesRepo) => void;
  selectedNode: Memory | Topic | null;
  user: User | null;
}

export default function TreeSidebar({
  repo,
  onNodeSelect,
  onAddMemory,
  onAddCategorization,
  onUpdateRepo,
  selectedNode,
  user
}: TreeSidebarProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingNode, setEditingNode] = useState<Memory | Topic | null>(null);
  const [editName, setEditName] = useState("");

  const saveToFirestore = async (updatedRepo: MemoriesRepo) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "memoryRepos", user.uid), updatedRepo);
    } catch (error) {
      console.error("Error saving to Firestore:", error);
    }
  };

  const toggleNode = (node: Memory | Topic) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(node.name)) {
      newExpanded.delete(node.name);
    } else {
      newExpanded.add(node.name);
    }
    setExpandedNodes(newExpanded);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() === "") return;
    
    const newCategory: Topic = {
      name: newCategoryName,
      children: []
    };

    const newRepo = { ...repo };
    newRepo.memories.children.push(newCategory);
    onUpdateRepo(newRepo);
    saveToFirestore(newRepo);
    
    setNewCategoryName("");
    setShowCategoryInput(false);
  };

  const handleNameEdit = (node: Memory | Topic) => {
    setEditingNode(node);
    setEditName(node.name);
  };

  const saveNameEdit = () => {
    if (!editingNode) return;
    
    const updateInRepo = (children: (Memory | Topic)[]): boolean => {
      for (let i = 0; i < children.length; i++) {
        if (children[i] === editingNode) {
          children[i] = { ...editingNode, name: editName };
          return true;
        }
        if ('children' in children[i]) {
          if (updateInRepo((children[i] as Topic).children)) {
            return true;
          }
        }
      }
      return false;
    };

    const newRepo = { ...repo };
    updateInRepo(newRepo.memories.children);
    onUpdateRepo(newRepo);
    saveToFirestore(newRepo);
    setEditingNode(null);
  };

  const handleDelete = (node: Memory | Topic) => {
    if (window.confirm(`Delete "${node.name}" and all its contents? This cannot be undone.`)) {
      const removeNode: any = (children: (Memory | Topic)[]) => {
        return children.filter(child => child !== node)
          .map(child => {
            if ('children' in child) {
              return { ...child, children: removeNode(child.children) };
            }
            return child;
          });
      };
      
      const newRepo = { ...repo };
      newRepo.memories.children = removeNode(newRepo.memories.children);
      onUpdateRepo(newRepo);
      saveToFirestore(newRepo);
      
      if (selectedNode === node) {
        onNodeSelect(repo.memories);
      }
    }
  };

  const renderNode = (node: Memory | Topic, depth = 0) => {
    const isTopic = 'children' in node;
    const isSelected = selectedNode === node;
    const isExpanded = expandedNodes.has(node.name);
    const isEditing = editingNode === node;

    return (
      <div 
        key={node.id || node.name} 
        className="mb-1 group relative"
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <div 
          className={`flex items-center py-1 px-2 rounded-md text-sm ${
            isSelected ? "bg-blue-100" : "hover:bg-gray-100"
          }`}
          onClick={() => onNodeSelect(node)}
        >
          {isTopic && (
            <span 
              className="mr-1 text-xs w-4 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node);
              }}
            >
              {isExpanded ? <IoIosArrowDown /> : <IoIosArrowForward />}
            </span>
          )}
          
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveNameEdit();
                if (e.key === "Escape") setEditingNode(null);
              }}
              onBlur={saveNameEdit}
              className="flex-1 bg-transparent outline-none text-sm"
              autoFocus
            />
          ) : (
            <span className="truncate">{node.name}</span>
          )}
          
          <div className="ml-auto opacity-0 group-hover:opacity-100 flex">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleNameEdit(node);
              }}
              className="text-xs p-1 hover:bg-gray-200 rounded"
            >
              <BiPencil />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(node);
              }}
              className="text-xs p-1 hover:bg-gray-200 rounded"
            >
              <BiTrash />
            </button>
          </div>
        </div>
        
        {isTopic && isExpanded && (
          <div className="ml-4">
            {(node as Topic).children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-2">
      {/* Buttons at the top */}
      <div className="flex flex-col gap-1 mb-2">
        <button
          onClick={onAddMemory}
          className="text-xs py-1 px-2 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center"
        >
          <span className="mr-1">+</span>
          Add Memory
        </button>
        {showCategoryInput ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategory();
                if (e.key === "Escape") setShowCategoryInput(false);
              }}
              className="flex-1 text-xs p-1 border rounded"
              autoFocus
            />
            <button
              onClick={handleAddCategory}
              className="text-xs p-1 bg-blue-100 hover:bg-blue-200 rounded"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCategoryInput(true)}
            className="text-xs py-1 px-2 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center"
          >
            <span className="mr-1">+</span>
            Add Category
          </button>
        )}
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto">
        {repo.memories.children.map(node => renderNode(node))}
      </div>
    </div>
  );
}