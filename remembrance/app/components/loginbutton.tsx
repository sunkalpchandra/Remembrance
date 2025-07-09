"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(inputs);
}

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        tiltingShadow:
          "content-center items-center cursor-pointer flex flex-row flex-nowrap gap-1 justify-center overflow-visible relative decoration-0 rounded-lg bg-[rgb(56,56,56)] shadow-[rgb(73,73,73)_0px_-2.4px_0px_0px_inset,_rgba(40,40,40,0.2)_0px_1px_3px_0px,_rgb(45,45,45)_0px_0px_0px_1px] hover:shadow-inner transition-all duration-300 ease-in-out text-xs font-sans cursor-pointer box-border antialiased text-white hover:bg-[rgb(70,70,70)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        minimal: "h-auto p-2 gap-2 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
