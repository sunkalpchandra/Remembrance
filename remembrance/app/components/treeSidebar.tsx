"use client";
import { useState, useEffect } from "react";
import { MemoriesRepo, Memory, Topic } from "../lib/types";
import type { AppUser } from "./usercontext";
import {
  BiChevronRight,
  BiFolder,
  BiFile,
  BiPencil,
  BiTrash,
  BiCheck,
  BiAlarmExclamation,
  BiBookmarkPlus,
  BiMessageAdd,
  BiBrain,
} from "react-icons/bi";

interface TreeSidebarProps {
  repo: MemoriesRepo;
  onNodeSelect: (node: Memory | Topic) => void;
  onAddMemory: () => void;
  onUpdateRepo: (repo: MemoriesRepo) => void;
  selectedNode: Memory | Topic | null;
  user: AppUser | null;
}

// Delete Confirmation Modal Component
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

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        backgroundColor: `rgba(0, 0, 0, 0.5)`,
      }}
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <BiAlarmExclamation className="w-6 h-6 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Delete {itemType}
          </h3>
        </div>

        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <strong>"{itemName}"</strong> and all
          its contents? This action cannot be undone.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-150 flex items-center gap-2"
          >
            <BiTrash className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default function TreeSidebar({
  repo,
  onNodeSelect,
  onAddMemory,
  onUpdateRepo,
  selectedNode,
  user,
}: TreeSidebarProps) {
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
  const [isDragging, setIsDragging] = useState(false);

  // Modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    node: Memory | Topic | null;
  }>({ isOpen: false, node: null });

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
      children: [],
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
        if ("children" in children[i]) {
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

  // Open delete modal
  const handleDeleteClick = (node: Memory | Topic) => {
    setDeleteModal({ isOpen: true, node });
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, node: null });
  };

  // Confirm delete
  const confirmDelete = () => {
    const node = deleteModal.node;
    if (!node) return;

    const removeNode = (children: (Memory | Topic)[]): (Memory | Topic)[] => {
      return children
        .filter((child) => child !== node)
        .map((child) => {
          if ("children" in child) {
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

    closeDeleteModal();
  };

  // Deep clone to avoid mutations
  const deepClone = (obj: any) => JSON.parse(JSON.stringify(obj));

  // Remove a node from anywhere in the tree and return the updated tree + removed node
  const removeNodeFromTree = (
    nodeToRemove: Memory | Topic,
    tree: MemoriesRepo,
  ): {
    newTree: MemoriesRepo;
    removedNode: Memory | Topic | null;
  } => {
    const newTree = deepClone(tree);
    let removedNode: Memory | Topic | null = null;

    const removeRecursively = (
      children: (Memory | Topic)[],
    ): (Memory | Topic)[] => {
      const newChildren: (Memory | Topic)[] = [];

      for (const child of children) {
        if (child.name === nodeToRemove.name && child.id === nodeToRemove.id) {
          removedNode = child;
          continue; // Skip this node (remove it)
        }

        if ("children" in child) {
          const updatedChild = {
            ...child,
            children: removeRecursively(child.children),
          };
          newChildren.push(updatedChild);
        } else {
          newChildren.push(child);
        }
      }

      return newChildren;
    };

    newTree.memories.children = removeRecursively(newTree.memories.children);
    return { newTree, removedNode };
  };

  // Insert a node at a specific location in the tree
  const insertNodeInTree = (
    nodeToInsert: Memory | Topic,
    targetNode: Memory | Topic,
    action: "inside" | "after" | "before",
    tree: MemoriesRepo,
  ): MemoriesRepo => {
    const newTree = deepClone(tree);

    const insertRecursively = (
      children: (Memory | Topic)[],
    ): (Memory | Topic)[] => {
      const newChildren: (Memory | Topic)[] = [];

      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        if (child.name === targetNode.name && child.id === targetNode.id) {
          if (action === "before") {
            newChildren.push(nodeToInsert);
            newChildren.push(child);
          } else if (action === "after") {
            newChildren.push(child);
            newChildren.push(nodeToInsert);
          } else if (action === "inside" && "children" in child) {
            const updatedChild = {
              ...child,
              children: [...child.children, nodeToInsert],
            };
            newChildren.push(updatedChild);
          } else {
            // If trying to insert inside a memory, insert after instead
            newChildren.push(child);
            newChildren.push(nodeToInsert);
          }
        } else {
          if ("children" in child) {
            const updatedChild = {
              ...child,
              children: insertRecursively(child.children),
            };
            newChildren.push(updatedChild);
          } else {
            newChildren.push(child);
          }
        }
      }

      return newChildren;
    };

    newTree.memories.children = insertRecursively(newTree.memories.children);
    return newTree;
  };

  // Simplified drop action determination
  const getDropAction = (
    e: React.DragEvent,
    targetNode: Memory | Topic,
  ): "inside" | "after" | "before" => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const isTopic = "children" in targetNode;

    // For collections (topics), prefer "inside" unless very close to edges
    if (isTopic) {
      if (y < height * 0.2) return "before";
      if (y > height * 0.8) return "after";
      return "inside";
    } else {
      // For memories, only before/after
      return y < height * 0.5 ? "before" : "after";
    }
  };

  // Handle the drop operation
  const handleDrop = () => {
    if (!draggedNode || !dropTarget.node) return;

    // Prevent dropping a node onto itself
    if (
      draggedNode.name === dropTarget.node.name &&
      draggedNode.id === dropTarget.node.id
    ) {
      resetDragState();
      return;
    }

    // Prevent dropping a collection into its own descendants
    if (
      "children" in draggedNode &&
      isDescendant(dropTarget.node, draggedNode)
    ) {
      resetDragState();
      return;
    }

    try {
      // Remove the node from its current location
      const { newTree, removedNode } = removeNodeFromTree(draggedNode, repo);

      if (!removedNode) {
        console.error("Could not find node to remove");
        resetDragState();
        return;
      }

      // Insert the node at the new location
      const finalTree = insertNodeInTree(
        removedNode,
        dropTarget.node,
        dropTarget.action,
        newTree,
      );

      // Auto-expand the target if we're dropping inside it
      if (dropTarget.action === "inside" && "children" in dropTarget.node) {
        setExpandedNodes((prev) => new Set(prev).add(dropTarget.node!.name));
      }

      onUpdateRepo(finalTree);
      saveToFirestore(finalTree);
    } catch (error) {
      console.error("Error during drop operation:", error);
    }

    resetDragState();
  };

  const resetDragState = () => {
    setDraggedNode(null);
    setDropTarget({ node: null, action: "inside" });
    setIsDragging(false);
  };

  // Check if a node is a descendant of another node
  const isDescendant = (
    potentialDescendant: Memory | Topic,
    ancestor: Memory | Topic,
  ): boolean => {
    if (!("children" in ancestor)) return false;

    return (ancestor as Topic).children.some((child) => {
      if (
        child.name === potentialDescendant.name &&
        child.id === potentialDescendant.id
      ) {
        return true;
      }
      return isDescendant(potentialDescendant, child);
    });
  };

  // Render a single node with drag and drop support
  const renderNode = (node: Memory | Topic, depth = 0) => {
    const isTopic = "children" in node;
    const isSelected = selectedNode === node;
    const isExpanded = expandedNodes.has(node.name);
    const isEditing = editingNode === node;
    const isBeingDragged =
      draggedNode?.name === node.name && draggedNode?.id === node.id;
    const isDropTarget =
      dropTarget.node?.name === node.name && dropTarget.node?.id === node.id;
    const isAI = !isTopic && !!(node as Memory).aiGenerated;
    const isAITopic = isTopic && node.id === "ai-memories";

    const dragHandlers = {
      draggable: true,
      onDragStart: (e: React.DragEvent<HTMLDivElement>) => {
        setDraggedNode(node);
        setIsDragging(true);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", node.name);

        // Add a small delay to prevent accidental drags
        setTimeout(() => {
          if (draggedNode) {
            e.currentTarget.style.opacity = "0.5";
          }
        }, 50);
      },
      onDragEnd: () => {
        resetDragState();
      },
    };

    const dropHandlers = {
      onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!draggedNode || isBeingDragged) return;

        const action = getDropAction(e, node);
        setDropTarget({ node, action });
        e.dataTransfer.dropEffect = "move";
      },
      onDragEnter: (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
      },
      onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
        // Only clear if we're actually leaving the element boundaries
        const rect = e.currentTarget.getBoundingClientRect();
        const buffer = 5; // Small buffer to prevent flickering
        if (
          e.clientX < rect.left - buffer ||
          e.clientX > rect.right + buffer ||
          e.clientY < rect.top - buffer ||
          e.clientY > rect.bottom + buffer
        ) {
          setDropTarget({ node: null, action: "inside" });
        }
      },
      onDrop: (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        handleDrop();
      },
    };

    // Visual styling based on drop state
    let dropIndicatorClass = "";
    let nodeClass = "";

    if (isDropTarget && draggedNode && !isBeingDragged) {
      switch (dropTarget.action) {
        case "before":
          dropIndicatorClass = "border-t-4 border-blue-500";
          break;
        case "after":
          dropIndicatorClass = "border-b-4 border-blue-500";
          break;
        case "inside":
          nodeClass =
            "bg-blue-50 border-2 border-blue-300 border-dashed rounded-lg";
          break;
      }
    }

    return (
      <div
        key={`${node.name}-${node.id || depth}`}
        className={`mb-1 w-full transition-all duration-200 ${dropIndicatorClass}`}
        style={{ paddingLeft: `${depth * 16}px` }}
        {...dropHandlers}
      >
        <div
          className={`group flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-150 cursor-move w-full ${nodeClass} ${
            isSelected ? "bg-white border border-gray-200" : "hover:bg-gray-100"
          } ${isBeingDragged ? "opacity-30 transform scale-95" : ""}`}
          onClick={() => onNodeSelect(node)}
          {...dragHandlers}
        >
          {/* Expand/Collapse Arrow */}
          {isTopic && (
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors duration-75 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node);
              }}
            >
              <BiChevronRight
                className={`w-3 h-3 text-gray-500 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
              />
            </button>
          )}

          {/* Icon */}
          {isTopic ? (
            isAITopic ? (
              <BiBrain
                className={`w-4 h-4 flex-shrink-0 transition-colors duration-150 ${
                  isDropTarget && dropTarget.action === "inside"
                    ? "text-violet-600"
                    : "text-violet-400"
                }`}
              />
            ) : (
              <BiFolder
                className={`w-4 h-4 flex-shrink-0 transition-colors duration-150 ${
                  isDropTarget && dropTarget.action === "inside"
                    ? "text-blue-600"
                    : "text-gray-500"
                }`}
              />
            )
          ) : isAI ? (
            <BiBrain className="w-4 h-4 text-violet-400 flex-shrink-0" />
          ) : (
            <BiFile className="w-4 h-4 text-gray-500 flex-shrink-0" />
          )}

          {/* Name or Edit Input */}
          {isEditing ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveNameEdit();
                }
                if (e.key === "Escape") {
                  setEditingNode(null);
                }
              }}
              onBlur={() => {
                if (editName.trim() && editName !== node.name) {
                  saveNameEdit();
                } else {
                  setEditingNode(null);
                }
              }}
              className="flex-1 min-w-0 text-sm font-medium bg-white border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:border-blue-500"
            />
          ) : (
            <div
              className={`flex-1 min-w-0 text-sm font-medium truncate transition-colors duration-75 ${
                isSelected
                  ? "text-gray-900 font-semibold"
                  : isDropTarget && dropTarget.action === "inside" && isTopic
                    ? "text-blue-700"
                    : isAI || isAITopic
                      ? "text-violet-700 hover:text-violet-900"
                      : "text-gray-700 hover:text-gray-900"
              }`}
              title={node.name}
            >
              {node.name}
              {isDropTarget && (
                <span className="text-xs text-blue-600 ml-2">
                  {dropTarget.action === "inside"
                    ? "↳"
                    : dropTarget.action === "before"
                      ? "↑"
                      : "↓"}
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div
            className={`flex items-center transition-opacity duration-75 flex-shrink-0 ${editingNode === node ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            {editingNode === node ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  saveNameEdit();
                }}
                className="p-1 hover:bg-green-200 bg-green-100 rounded transition-colors duration-75"
                title="Save changes"
              >
                <BiCheck className="w-4 h-4 text-green-600" />
              </button>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNameEdit(node);
                  }}
                  className="p-1 hover:bg-gray-200 rounded transition-colors duration-75"
                  title="Rename"
                >
                  <BiPencil className="w-3 h-3 text-gray-500" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(node);
                  }}
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
          <div className="mt-1 w-full">
            {(node as Topic).children.map((child, index) =>
              renderNode(child, depth + 1),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={`h-full w-full flex flex-col transition-all duration-200 ${
          isDragging
            ? "bg-blue-50 border-r-4 border-blue-400 shadow-lg"
            : "bg-white "
        }`}
      >
        {/* Header */}
        <div className="px-3 py-2 w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-gray-900 truncate">Memories</span>
            {isDragging && (
              <span className="text-xs text-blue-600 font-medium animate-pulse">
                Drag onto items to organize
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-0.5 w-full">
            <button
              onClick={onAddMemory}
              className="flex items-center w-full gap-3 px-2 py-1.5 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-75"
            >
              <BiMessageAdd className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium truncate">Add Memory</span>
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
                  className="flex-1 min-w-0 text-sm bg-white border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleAddCategory}
                  className="p-1 hover:bg-green-200 bg-green-100 rounded transition-colors duration-75 flex-shrink-0"
                  title="Add category"
                >
                  <BiCheck className="w-4 h-4 text-green-600" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCategoryInput(true)}
                className="flex items-center w-full gap-3 px-2 py-1.5 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-75"
              >
                <BiBookmarkPlus className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium truncate">
                  Add Category
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto px-2 py-1 w-full">
          {repo.memories.children.length === 0 ? (
            <div className="text-center py-10 text-gray-500 w-full px-4">
              <BiBrain className="w-10 h-10 mx-auto mb-3 text-violet-300" />
              <p className="text-sm font-medium text-gray-600">No memories yet</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">
                Chat with Remembrance to save memories, or add one manually.
              </p>
              <button
                onClick={onAddMemory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-700 transition-colors"
              >
                <BiMessageAdd className="w-3.5 h-3.5" />
                Add Memory
              </button>
            </div>
          ) : (
            <div className="w-full">
              {repo.memories.children.map((node, index) => renderNode(node, 0))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        itemName={deleteModal.node?.name || ""}
        itemType={
          "children" in (deleteModal.node || {}) ? "Collection" : "Memory"
        }
      />
    </>
  );
}
