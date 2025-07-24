import * as React from "react";

export function Command({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={`bg-white border rounded-lg shadow-xl w-full max-w-md ${className}`}
      {...props}
    />
  );
}

export const CommandInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full px-4 py-2 border-b outline-none text-sm ${className}`}
      {...props}
    />
  )
);
CommandInput.displayName = "CommandInput";

export function CommandGroup({ heading, children, className = "", ...props }: React.PropsWithChildren<{ heading?: string; className?: string }>) {
  return (
    <div className={`py-2 ${className}`} {...props}>
      {heading && <div className="px-4 pb-1 text-xs font-semibold text-gray-500">{heading}</div>}
      <div>{children}</div>
    </div>
  );
}

export function CommandItem({ children, className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div
      tabIndex={0}
      className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-gray-100 focus:bg-gray-100 rounded transition-colors ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CommandSeparator({ className = "", ...props }: React.ComponentProps<"div">) {
  return <div className={`my-2 border-t ${className}`} {...props} />;
} 