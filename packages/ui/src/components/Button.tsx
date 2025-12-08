import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";

// Button variants with glassmorphism effects
const buttonVariants = cva(
  // Base styles - glassmorphism foundation
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 backdrop-blur-md border cursor-pointer relative overflow-hidden",
  {
    variants: {
      variant: {
        // Primary glass with WindTre orange
        primary: [
          "bg-primary/10 border-primary/30 text-primary-700 dark:text-primary-300",
          "shadow-[0_8px_32px_rgba(255,105,0,0.37)]",
          "hover:bg-primary/20 hover:border-primary/40 hover:scale-[1.02]",
          "active:scale-[0.98] active:bg-primary/30"
        ],
        
        // Secondary glass with WindTre purple  
        secondary: [
          "bg-secondary/10 border-secondary/30 text-secondary-700 dark:text-secondary-300",
          "shadow-[0_8px_32px_rgba(123,44,191,0.37)]",
          "hover:bg-secondary/20 hover:border-secondary/40 hover:scale-[1.02]",
          "active:scale-[0.98] active:bg-secondary/30"
        ],
        
        // Neutral glass
        glass: [
          "bg-white/10 dark:bg-black/10 border-white/20 dark:border-white/10",
          "text-neutral-700 dark:text-neutral-300",
          "shadow-[0_8px_32px_rgba(31,38,135,0.37)]",
          "hover:bg-white/20 dark:hover:bg-black/20 hover:border-white/30 dark:hover:border-white/20 hover:scale-[1.02]",
          "active:scale-[0.98]"
        ],
        
        // Solid variants for contrast
        solid: [
          "bg-primary border-primary text-white",
          "shadow-lg shadow-primary/25",
          "hover:bg-primary-600 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]",
          "active:scale-[0.98]"
        ],
        
        // Outline variant
        outline: [
          "border-2 border-primary/50 bg-transparent text-primary-600 dark:text-primary-400",
          "hover:bg-primary/10 hover:border-primary hover:scale-[1.02]",
          "active:scale-[0.98]"
        ],
        
        // Ghost variant
        ghost: [
          "bg-transparent border-transparent text-neutral-600 dark:text-neutral-400",
          "hover:bg-neutral/10 hover:text-neutral-900 dark:hover:text-neutral-100 hover:scale-[1.02]",
          "active:scale-[0.98]"
        ]
      },
      
      size: {
        sm: "h-8 px-3 text-xs rounded-md",
        md: "h-10 px-4 py-2 text-sm rounded-lg", 
        lg: "h-12 px-6 py-3 text-base rounded-xl",
        xl: "h-14 px-8 py-4 text-lg rounded-2xl",
        icon: "h-10 w-10 rounded-lg",
        "icon-sm": "h-8 w-8 rounded-md",
        "icon-lg": "h-12 w-12 rounded-xl"
      },
      
      glow: {
        none: "",
        soft: "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-primary/20 before:to-secondary/20 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 before:-z-10",
        strong: "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-primary/40 before:to-secondary/40 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 before:-z-10 before:blur-md"
      }
    },
    
    defaultVariants: {
      variant: "primary",
      size: "md",
      glow: "none"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, glow, asChild = false, ...props }, ref) => {
    const Comp = "button";
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, glow, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };