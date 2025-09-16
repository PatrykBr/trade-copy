import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  shimmer?: boolean;
  asChild?: boolean; // render as child element (e.g., Link)
}

const base = 'relative inline-flex items-center justify-center gap-2 select-none whitespace-nowrap font-medium rounded-md transition appearance-none leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<string, string> = {
  primary: 'bg-cyan-500 text-neutral-900 hover:bg-cyan-400 active:bg-cyan-300 shadow-sm shadow-cyan-500/20',
  secondary: 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700 active:bg-neutral-600',
  outline: 'border border-neutral-700 text-neutral-100 hover:bg-neutral-800/60 active:bg-neutral-800',
  ghost: 'text-neutral-300 hover:bg-neutral-800/60 active:bg-neutral-800',
  gradient: 'relative text-neutral-900 font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 active:from-cyan-200 active:to-blue-300 shadow shadow-cyan-500/30'
};

const sizes: Record<string, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10 p-0',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'primary', size = 'md', shimmer, asChild, children, ...props }, ref) => {
  if (asChild) {
    return (
      <span className={cn(base, variants[variant], sizes[size], shimmer && 'animate-shimmer bg-[length:200%_100%]', className)} {...props}>
        {children}
      </span>
    );
  }
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], shimmer && 'animate-shimmer bg-[length:200%_100%]', className)}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = 'Button';

export { Button };