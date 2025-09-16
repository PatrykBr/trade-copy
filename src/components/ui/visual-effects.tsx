"use client";
import * as React from 'react';
import { cn } from '@/lib/utils';

// Subtle animated noise texture (GPU cheap) using CSS background.
export function Noise({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay [background-image:repeating-radial-gradient(circle_at_0_0,rgba(255,255,255,0.15)_0,rgba(255,255,255,0.15)_1px,transparent_1px,transparent_4px)]', className)}
    />
  );
}

interface SpotlightProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  colorFrom?: string;
  colorTo?: string;
  blur?: number;
  interactive?: boolean;
}

// Follows cursor to create a dynamic radial light.
export function Spotlight({
  className,
  size = 520,
  colorFrom = 'rgba(56,189,248,0.30)',
  colorTo = 'rgba(14,165,233,0)',
  blur = 120,
  interactive = true,
  ...props
}: SpotlightProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!interactive) return;
    const el = ref.current;
    if (!el) return;
    function handle(e: MouseEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty('--spot-x', x + 'px');
      el.style.setProperty('--spot-y', y + 'px');
    }
    window.addEventListener('mousemove', handle, { passive: true });
    return () => window.removeEventListener('mousemove', handle);
  }, [interactive]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      {...props}
      style={{
        '--spot-size': size + 'px',
        '--spot-color-from': colorFrom,
        '--spot-color-to': colorTo,
        '--spot-blur': blur + 'px',
      } as React.CSSProperties}
    >
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: 'var(--spot-x, 50%)',
          top: 'var(--spot-y, 40%)',
          width: 'var(--spot-size)',
          height: 'var(--spot-size)',
          background: `radial-gradient(circle at center, var(--spot-color-from), var(--spot-color-to) 70%)`,
          filter: `blur(var(--spot-blur))`,
          transition: 'left .25s ease, top .25s ease',
        }}
      />
    </div>
  );
}

// Subtle multi-ring gradient for behind hero.
export function ConicRings({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 flex items-center justify-center opacity-60', className)}
    >
      <div className="relative w-[1200px] h-[1200px] max-w-none">
        <div className="absolute inset-0 rounded-full [background:conic-gradient(from_0deg,rgba(56,189,248,0.15),transparent_55%,rgba(14,165,233,0.2),transparent_85%)] blur-[60px]" />
        <div className="absolute inset-0 rounded-full border border-cyan-500/10" />
        <div className="absolute inset-12 rounded-full border border-cyan-500/10" />
        <div className="absolute inset-24 rounded-full border border-cyan-500/10" />
        <div className="absolute inset-40 rounded-full border border-cyan-500/10" />
      </div>
    </div>
  );
}
