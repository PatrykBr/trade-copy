import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'glow';
  interactive?: boolean;
}

const cardBase = 'relative rounded-xl border border-neutral-700/70 bg-[linear-gradient(145deg,rgba(30,41,59,0.9),rgba(17,24,39,0.85))] backdrop-blur-sm text-neutral-200 shadow-sm before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent)] before:pointer-events-none';
const cardVariants: Record<string,string> = {
  default: '',
  outline: 'border-neutral-600/70 bg-neutral-900/40',
  ghost: 'border-transparent bg-transparent shadow-none',
  glow: 'before:opacity-90 before:bg-[radial-gradient(circle_at_35%_25%,rgba(56,189,248,0.22),transparent_70%)]',
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant='default', interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardBase, cardVariants[variant], interactive && 'transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/10', className)}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4 pb-2', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('text-lg font-semibold tracking-tight', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-neutral-400', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4 pt-0 flex items-center gap-2', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };