import * as React from 'react';
import { cn } from '@/lib/utils';

interface BackgroundGridProps extends React.HTMLAttributes<HTMLDivElement> {
  showGradient?: boolean;
  fade?: boolean;
}

/**
 * BackgroundGrid provides a subtle animated grid + optional radial gradient halo.
 * Use as a wrapper with absolute positioning or as a section background.
 */
export function BackgroundGrid({ className, children, showGradient = true, fade = true, ...props }: BackgroundGridProps) {
  return (
    <div className={cn('relative overflow-hidden', className)} {...props}>
      <div className={cn('pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(circle_at_center,black,transparent_85%)]')} />
      {showGradient && (
        <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen" aria-hidden>
          <div className="absolute -inset-40 blur-3xl [background:radial-gradient(circle_at_30%_40%,rgba(56,189,248,.18),transparent_60%),radial-gradient(circle_at_70%_60%,rgba(14,165,233,.18),transparent_60%)]" />
        </div>
      )}
      {fade && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-neutral-950 to-transparent" />}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
