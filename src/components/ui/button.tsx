import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 select-none active:scale-[0.97] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white shadow-[0_8px_20px_-8px_rgb(11_76_180_/_0.55)] hover:bg-brand-700 active:bg-brand-800",
        ink: "bg-brand-800 text-white shadow-[0_8px_20px_-8px_rgb(11_52_122_/_0.55)] hover:bg-brand-900",
        accent: "bg-accent-600 text-white shadow-[0_8px_20px_-8px_rgb(20_111_59_/_0.5)] hover:bg-accent-700",
        secondary: "border border-line-strong bg-surface text-ink hover:border-brand-300 hover:bg-brand-50/50",
        ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
        danger: "bg-danger-600 text-white shadow-xs hover:bg-danger-fg",
        "danger-outline": "border border-danger-line bg-surface text-danger-fg hover:bg-danger-bg",
        navy: "bg-navy-800 text-white hover:bg-navy-700",
        link: "h-auto px-0 text-brand-700 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-600",
      },
      size: {
        sm: "h-9 rounded-full px-4 text-[13px] font-semibold",
        md: "h-11 rounded-full px-5 text-sm font-semibold",
        lg: "h-[52px] rounded-full px-7 text-[15px] font-semibold",
        icon: "size-10 rounded-full",
        "icon-sm": "size-8 rounded-full",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: IconName;
  iconRight?: IconName;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, asChild, loading, icon, iconRight, children, disabled, ...props }, ref,
) {
  const Comp = asChild ? Slot : "button";
  const iconSize = size === "sm" || size === "icon-sm" ? 18 : 20;
  if (asChild) {
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, block }), className)} {...props}>{children}</Comp>;
  }
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
});
