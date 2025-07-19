import React, { useRef } from "react";

type VerticalDividerProps = {
  onResize: (deltaX: number) => void;
  ariaLabel: string;
  className?: string;
  min?: number;
  max?: number;
};

const VerticalDivider: React.FC<VerticalDividerProps> = ({
  onResize,
  ariaLabel,
  className = "",
}) => {
  const dragging = useRef(false);
  const lastX = useRef(0);

  // Mouse/touch drag handlers
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    dragging.current = true;
    lastX.current = "touches" in e ? e.touches[0].clientX : e.clientX;
    document.addEventListener("mousemove", handleDragMove as any);
    document.addEventListener("mouseup", handleDragEnd as any);
    document.addEventListener("touchmove", handleDragMove as any);
    document.addEventListener("touchend", handleDragEnd as any);
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!dragging.current) return;
    const clientX = "touches" in e && e.touches.length > 0 ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const deltaX = clientX - lastX.current;
    lastX.current = clientX;
    onResize(deltaX);
  };

  const handleDragEnd = () => {
    dragging.current = false;
    document.removeEventListener("mousemove", handleDragMove as any);
    document.removeEventListener("mouseup", handleDragEnd as any);
    document.removeEventListener("touchmove", handleDragMove as any);
    document.removeEventListener("touchend", handleDragEnd as any);
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      onResize(-10); // Nudge left
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      onResize(10); // Nudge right
      e.preventDefault();
    }
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={ariaLabel}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      onKeyDown={handleKeyDown}
      className={`w-1 bg-gray-300 hover:bg-gray-400 focus:bg-gray-500 cursor-col-resize outline-none transition-colors ${className}`}
      style={{ minWidth: 4, maxWidth: 8 }}
    />
  );
};

export default VerticalDivider; 