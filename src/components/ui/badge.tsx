"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary-shadcn text-primary-foreground-shadcn hover:bg-primary-shadcn/80",
        secondary:
          "border-transparent bg-secondary-shadcn text-secondary-foreground-shadcn hover:bg-secondary-shadcn/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProperties
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...properties }: BadgeProperties) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      {...properties}
    />
  );
}

export { Badge, badgeVariants };
