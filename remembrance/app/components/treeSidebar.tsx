"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MemoriesRepo, Memory, Topic } from "../lib/types";
import type { AppUser } from "./usercontext";
import {
  BiChevronRight,
  BiFolder,
  BiFile,
  BiPencil,
  BiTrash,
  BiCheck,
  BiBook,
  BiBookmarkPlus,
  BiMessageAdd,
  BiArrowBack,
} from "react-icons/bi";

interface TreeSidebarProps {
  repo: MemoriesRepo;
  onNodeSelect: (node: Memory | Topic) => void;
  onAddMemory: () => void;
  onUpdateRepo: (repo: MemoriesRepo) => void;
  selectedNode: Memory | Topic | null;
  user: AppUser | null;
  onMemoryDeleted?: () => void;
}

const DeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-white text-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-200 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-gray-900 mb-2">Delete {itemType}?</h3>
        <p className="text-sm text-gray-600 mb-6">
          <strong>"{itemName}"</strong> will be permanently deleted. This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default function TreeSidebar({
  repo,
  onNodeSelect,
  onAddMemory,
  onUpdateRepo,
  selectedNode,
  user,
  onMemoryDeleted,
}: TreeSidebarProps) {
  const router = useRouter();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingNode, setEditingNode] = useState<Memory | Topic | null>(null);
  const [editName, setEditName] = useState("");
  const [draggedNode, setDraggedNode] = useState<Memory | Topic | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    node: Memory | Topic | null;
    action: "inside" | "after" | "before";
  }>({ node: null, action: "inside" });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    node: Memory | Topic | null;
  }>({ isOpen: false, node: null });

  const saveToStorage = (updatedRepo: MemoriesRepo) => {
    if (!user || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        `memoryRepo:${user.uid}`,
        JSON.stringify(updatedRepo),
      );
    } catch (e) {
      console.error("Error saving memory repo:", e);
    }
  };

  const toggleNode = (node: Memory | Topic) => {
    const next = new Set(expandedNodes);
    if (next.has(node.name)) next.delete(node.name);
    else next.add(node.name);
    setExpandedNodes(next);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCategory: Topic = { name: newCategoryName.trim(), children: [] };
    const newRepo = { ...repo };
    newRepo.memories.children.push(newCategory);
    onUpdateRepo(newRepo);
    saveToStorage(newRepo);
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
        if ("children" in children[i]) {
          if (updateInRepo((children[i] as Topic).children)) return true;
        }
      }
      return false;
    };
    const newRepo = { ...repo };
    updateInRepo(newRepo.memories.children);
    onUpdateRepo(newRepo);
    saveToStorage(newRepo);
    setEditingNode(null);
  };

  const confirmDelete = () => {
    const node = deleteModal.node;
    if (!node) return;

    // Collect all memory IDs to delete from DB
    const collectIds = (n: Memory | Topic): string[] => {
      if ("children" in n) return (n as Topic).children.flatMap(collectIds);
      const id = (n as Memory).id;
      return id ? [id] : [];
    };
    const idsToDelete = collectIds(node);
    idsToDelete.forEach((id) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(id)) {
        fetch(`/api/memories/${id}`, { method: "DELETE" }).catch(() => {});
      }
    });

    const removeNode = (children: (Memory | Topic)[]): (Memory | Topic)[] =>
      children
        .filter((c) => c !== node)
        .map((c) =>
          "children" in c ? { ...c, children: removeNode(c.children) } : c,
        );
    const newRepo = { ...repo };
    newRepo.memories.children = removeNode(newRepo.memories.children);
    onUpdateRepo(newRepo);
    saveToStorage(newRepo);
    if (selectedNode === node) onNodeSelect(repo.memories);
    setDeleteModal({ isOpen: false, node: null });
    onMemoryDeleted?.();
  };

  const deepClone = (obj: any) => JSON.parse(JSON.stringify(obj));

  const removeNodeFromTree = (
    nodeToRemove: Memory | Topic,
    tree: MemoriesRepo,
  ): { newTree: MemoriesRepo; removedNode: Memory | Topic | null } => {
    const newTree = deepClone(tree);
    let removedNode: Memory | Topic | null = null;

    const remove = (children: (Memory | Topic)[]): (Memory | Topic)[] => {
      const out: (Memory | Topic)[] = [];
      for (const c of children) {
        if (c.name === nodeToRemove.name && c.id === nodeToRemove.id) {
          removedNode = c;
          continue;
        }
        out.push("children" in c ? { ...c, children: remove(c.children) } : c);
      }
      return out;
    };

    newTree.memories.children = remove(newTree.memories.children);
    return { newTree, removedNode };
  };

  const insertNodeInTree = (
    nodeToInsert: Memory | Topic,
    targetNode: Memory | Topic,
    action: "inside" | "after" | "before",
    tree: MemoriesRepo,
  ): MemoriesRepo => {
    const newTree = deepClone(tree);

    const insert = (children: (Memory | Topic)[]): (Memory | Topic)[] => {
      const out: (Memory | Topic)[] = [];
      for (const c of children) {
        if (c.name === targetNode.name && c.id === targetNode.id) {
          if (action === "before") {
            out.push(nodeToInsert, c);
          } else if (action === "after") {
            out.push(c, nodeToInsert);
          } else if (action === "inside" && "children" in c) {
            out.push({ ...c, children: [...c.children, nodeToInsert] });
          } else {
            out.push(c, nodeToInsert);
          }
        } else {
          out.push("children" in c ? { ...c, children: insert(c.children) } : c);
        }
      }
      return out;
    };

    newTree.memories.children = insert(newTree.memories.children);
    return newTree;
  };

  const getDropAction = (
    e: React.DragEvent,
    targetNode: Memory | Topic,
  ): "inside" | "after" | "before" => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    if ("children" in targetNode) {
      if (y < h * 0.2) return "before";
      if (y > h * 0.8) return "after";
      return "inside";
    }
    return y < h * 0.5 ? "before" : "after";
  };

  const isDescendant = (
    potentialDescendant: Memory | Topic,
    ancestor: Memory | Topic,
  ): boolean => {
    if (!("children" in ancestor)) return false;
    return (ancestor as Topic).children.some(
      (c) =>
        (c.name === potentialDescendant.name && c.id === potentialDescendant.id) ||
        isDescendant(potentialDescendant, c),
    );
  };

  const resetDragState = () => {
    setDraggedNode(null);
    setDropTarget({ node: null, action: "inside" });
  };

  const handleDrop = () => {
    if (!draggedNode || !dropTarget.node) return;
    if (
      draggedNode.name === dropTarget.node.name &&
      draggedNode.id === dropTarget.node.id
    ) {
      resetDragState();
      return;
    }
    if ("children" in draggedNode && isDescendant(dropTarget.node, draggedNode)) {
      resetDragState();
      return;
    }
    const { newTree, removedNode } = removeNodeFromTree(draggedNode, repo);
    if (!removedNode) { resetDragState(); return; }
    const finalTree = insertNodeInTree(removedNode, dropTarget.node, dropTarget.action, newTree);
    if (dropTarget.action === "inside" && "children" in dropTarget.node) {
      setExpandedNodes((prev) => new Set(prev).add(dropTarget.node!.name));
    }
    onUpdateRepo(finalTree);
    saveToStorage(finalTree);
    resetDragState();
  };

  const renderNode = (node: Memory | Topic, depth = 0) => {
    const isTopic = "children" in node;
    const isSelected = selectedNode === node;
    const isExpanded = expandedNodes.has(node.name);
    const isEditing = editingNode === node;
    const isBeingDragged = draggedNode?.name === node.name && draggedNode?.id === node.id;
    const isDropTarget = dropTarget.node?.name === node.name && dropTarget.node?.id === node.id;
    const isAI = !isTopic && !!(node as Memory).aiGenerated;

    let dropBorderClass = "";
    let dropBgClass = "";
    if (isDropTarget && draggedNode && !isBeingDragged) {
      if (dropTarget.action === "before") dropBorderClass = "border-t-2 border-gray-400";
      else if (dropTarget.action === "after") dropBorderClass = "border-b-2 border-gray-400";
      else dropBgClass = "bg-gray-100 border border-gray-300 border-dashed rounded-md";
    }

    return (
      <div
        key={`${node.name}-${node.id || depth}`}
        className={`w-full ${dropBorderClass}`}
        style={{ paddingLeft: `${depth * 12}px` }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!draggedNode || isBeingDragged) return;
          setDropTarget({ node, action: getDropAction(e, node) });
          e.dataTransfer.dropEffect = "move";
        }}
        onDragEnter={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < rect.left - 4 || e.clientX > rect.right + 4 ||
            e.clientY < rect.top - 4 || e.clientY > rect.bottom + 4
          ) {
            setDropTarget({ node: null, action: "inside" });
          }
        }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(); }}
      >
        <div
          className={`group flex items-center gap-2 px-2 py-1 rounded-md transition-colors duration-75 cursor-pointer w-full ${dropBgClass} ${
            isSelected
              ? "bg-gray-100 text-gray-900"
              : "hover:bg-gray-100 text-gray-700"
          } ${isBeingDragged ? "opacity-40" : ""}`}
          onClick={() => onNodeSelect(node)}
          draggable
          onDragStart={(e) => {
            setDraggedNode(node);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", node.name);
          }}
          onDragEnd={resetDragState}
        >
          {/* Expand arrow for topics */}
          {isTopic ? (
            <button
              className="p-0.5 hover:bg-gray-200 rounded transition-colors duration-75 flex-shrink-0"
              onClick={(e) => { e.stopPropagation(); toggleNode(node); }}
            >
              <BiChevronRight
                className={`w-3 h-3 text-gray-500 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
              />
            </button>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}

          {/* Icon */}
          {isTopic ? (
            <BiFolder className="w-4 h-4 text-gray-500 flex-shrink-0" />
          ) : (
            <BiFile className="w-4 h-4 text-gray-500 flex-shrink-0" />
          )}

          {/* Name */}
          {isEditing ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); saveNameEdit(); }
                if (e.key === "Escape") setEditingNode(null);
              }}
              onBlur={() => {
                if (editName.trim() && editName !== node.name) saveNameEdit();
                else setEditingNode(null);
              }}
              className="flex-1 min-w-0 text-sm bg-white border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-gray-500"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="flex-1 min-w-0 text-sm truncate"
              title={node.name}
            >
              {node.name}
              {isAI && (
                <span className="ml-1 text-xs text-gray-400 font-normal">AI</span>
              )}
            </span>
          )}

          {/* Action buttons — visible on hover */}
          <div
            className={`flex items-center gap-0.5 flex-shrink-0 transition-opacity duration-75 ${
              isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {isEditing ? (
              <button
                onClick={(e) => { e.stopPropagation(); saveNameEdit(); }}
                className="p-1 hover:bg-gray-200 bg-gray-100 rounded transition-colors duration-75"
                title="Save"
              >
                <BiCheck className="w-3.5 h-3.5 text-gray-700" />
              </button>
            ) : (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleNameEdit(node); }}
                  className="p-1 hover:bg-gray-200 rounded transition-colors duration-75"
                  title="Rename"
                >
                  <BiPencil className="w-3 h-3 text-gray-500" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, node }); }}
                  className="p-1 hover:bg-red-100 rounded transition-colors duration-75"
                  title="Delete"
                >
                  <BiTrash className="w-3 h-3 text-gray-500" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Children */}
        {isTopic && isExpanded && (
          <div className="mt-0.5 w-full">
            {(node as Topic).children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="h-full w-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="border-b border-gray-200 px-3 py-2 flex items-center gap-2">
          <button
            onClick={() => router.push("/")}
            className="p-1 hover:bg-gray-200 rounded transition-colors duration-75 flex-shrink-0"
            title="Back to chat"
          >
            <BiArrowBack className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-medium text-gray-900">Memories</span>
        </div>

        {/* Action buttons */}
        <div className="px-3 py-2 space-y-0.5 border-b border-gray-200">
          <button
            onClick={onAddMemory}
            className="flex items-center w-full gap-3 px-2 py-1.5 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-75"
          >
            <BiMessageAdd className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">Add Memory</span>
          </button>

          {showCategoryInput ? (
            <div className="flex items-center gap-2 px-2 py-1 w-full">
              <input
                autoFocus
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCategory();
                  if (e.key === "Escape") setShowCategoryInput(false);
                }}
                placeholder="Category name..."
                className="flex-1 min-w-0 text-sm bg-white border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:border-gray-500"
              />
              <button
                onClick={handleAddCategory}
                className="p-1 hover:bg-gray-200 bg-gray-100 rounded transition-colors duration-75"
                title="Add"
              >
                <BiCheck className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCategoryInput(true)}
              className="flex items-center w-full gap-3 px-2 py-1.5 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-75"
            >
              <BiBookmarkPlus className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">Add Category</span>
            </button>
          )}

          <button
            onClick={() => router.push("/memory-book")}
            className="flex items-center w-full gap-3 px-2 py-1.5 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-75"
          >
            <BiBook className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">Memory Book</span>
          </button>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto px-2 py-2 w-full">
          {repo.memories.children.length === 0 ? (
            <div className="text-center py-8 px-3">
              <p className="text-sm text-gray-500">No memories yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Chat with Remembrance to save memories, or add one manually.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 w-full">
              {repo.memories.children.map((node) => renderNode(node, 0))}
            </div>
          )}
        </div>
      </div>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, node: null })}
        onConfirm={confirmDelete}
        itemName={deleteModal.node?.name || ""}
        itemType={"children" in (deleteModal.node || {}) ? "Category" : "Memory"}
      />
    </>
  );
}
