import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "../utils/cn";

// Card variants with glassmorphism effects
const cardVariants = cva(
  // Base glassmorphism styles
  "backdrop-blur-md border transition-all duration-300 relative overflow-hidden",
  {
    variants: {
      variant: {
        // Default glass card
        glass: [
          "bg-white/10 dark:bg-black/10 border-white/20 dark:border-white/10",
          "shadow-[0_8px_32px_rgba(31,38,135,0.37)]"
        ],
        
        // Primary themed glass
        primary: [
          "bg-primary/10 border-primary/30",
          "shadow-[0_8px_32px_rgba(255,105,0,0.37)]"
        ],
        
        // Secondary themed glass  
        secondary: [
          "bg-secondary/10 border-secondary/30",
          "shadow-[0_8px_32px_rgba(123,44,191,0.37)]"
        ],
        
        // Solid white card
        solid: [
          "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800",
          "shadow-lg"
        ],
        
        // Elevated glass with stronger backdrop
        elevated: [
          "bg-white/20 dark:bg-black/20 border-white/30 dark:border-white/20",
          "shadow-[0_16px_64px_rgba(31,38,135,0.37)]",
          "backdrop-blur-lg"
        ]
      },
      
      size: {
        sm: "p-3 rounded-lg",
        md: "p-4 rounded-xl", 
        lg: "p-6 rounded-2xl",
        xl: "p-8 rounded-3xl"
      },
      
      hover: {
        none: "",
        lift: "hover:scale-[1.02] hover:shadow-[0_12px_48px_rgba(31,38,135,0.5)]",
        glow: "hover:shadow-[0_8px_32px_rgba(31,38,135,0.37),0_0_32px_rgba(255,105,0,0.2)]",
        float: "hover:-translate-y-1 hover:shadow-[0_12px_48px_rgba(31,38,135,0.5)]"
      },
      
      interactive: {
        true: "cursor-pointer",
        false: ""
      }
    },
    
    defaultVariants: {
      variant: "glass",
      size: "md",
      hover: "none",
      interactive: false
    }
  }
);

// Animation variants for framer-motion
const cardAnimations = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.95 },
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 }
};

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
  animated?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    variant, 
    size, 
    hover, 
    interactive, 
    animated = false,
    asChild = false, 
    children,
    ...props 
  }, ref) => {
    const Comp = "div";
    
    if (animated) {
      return (
        <motion.div
          className={cn(cardVariants({ variant, size, hover, interactive, className }))}
          ref={ref}
          initial={cardAnimations.initial}
          animate={cardAnimations.animate}
          exit={cardAnimations.exit}
          whileHover={interactive ? cardAnimations.whileHover : undefined}
          whileTap={interactive ? cardAnimations.whileTap : undefined}
          transition={{ duration: 0.3, ease: "easeOut" }}
          {...props}
        >
          {children}
        </motion.div>
      );
    }
    
    return (
      <Comp
        className={cn(cardVariants({ variant, size, hover, interactive, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

Card.displayName = "Card";

// Card header component
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-4", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

// Card title component
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-neutral-900 dark:text-neutral-100",
      className
    )}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = "CardTitle";

// Card description component
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-neutral-600 dark:text-neutral-400", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

// Card content component
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-neutral-700 dark:text-neutral-300", className)}
    {...props}
  />
));
CardContent.displayName = "CardContent";

// Card footer component
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter, 
  cardVariants 
};