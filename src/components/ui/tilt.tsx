"use client";
import * as React from 'react';
import { cn } from '@/lib/utils';

interface TiltProps extends React.HTMLAttributes<HTMLDivElement> {
  maxRotate?: number; // degrees
  scale?: number;
  glare?: boolean;
}

export function Tilt({ className, children, maxRotate = 8, scale = 1.015, glare = true, ...props }: TiltProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function handle(e: MouseEvent) {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const rotX = (y - 0.5) * -maxRotate;
      const rotY = (x - 0.5) * maxRotate;
      el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`;
      if (glare) {
        el.style.setProperty('--glare-x', x.toString());
        el.style.setProperty('--glare-y', y.toString());
      }
    }
    function leave() {
      if (!el) return;
      el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
    }
    el.addEventListener('mousemove', handle);
    el.addEventListener('mouseleave', leave);
    return () => { el.removeEventListener('mousemove', handle); el.removeEventListener('mouseleave', leave); };
  }, [maxRotate, scale, glare]);
  return (
    <div ref={ref} className={cn('relative transition-transform duration-300 ease-out will-change-transform', glare && 'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_calc(var(--glare-x,0)*100%)_calc(var(--glare-y,0)*100%),rgba(255,255,255,0.20),transparent_60%)] after:opacity-0 hover:after:opacity-70 after:transition-opacity', className)} {...props}>
      {children}
    </div>
  );
}
