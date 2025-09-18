"use client";
import * as React from 'react';
import { cn } from '@/lib/utils';
import { safeRandomUUID } from '@/lib/uuid';

interface EventItem {
  id: string;
  t: number;
  text: string;
  tone: 'ok' | 'warn' | 'err';
}

const SAMPLE = [
  'master EURUSD BUY 1.20 received',
  'lot scaling balance_ratio 0.83 → 0.99',
  'risk check passed drawdown=3.2%',
  'dispatch batch start slaves=4',
  'fill acct_B19 15ms',
  'fill acct_J04 18ms',
  'slip warn acct_L83 +0.4p',
  'fill acct_Q92 27ms',
  'batch complete success=4 max=27ms',
];

export function ExecutionStream({ className }: { className?: string }) {
  const [events, setEvents] = React.useState<EventItem[]>([]);
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    let i = 0;
    const int = setInterval(() => {
      setEvents(ev => {
        const text = SAMPLE[i % SAMPLE.length];
        const tone: EventItem['tone'] = text.includes('warn') ? 'warn' : text.includes('err') ? 'err' : 'ok';
        const next = [...ev, { id: safeRandomUUID(), t: Date.now(), text, tone }];
        return next.slice(-12);
      });
      i++;
    }, 900);
    return () => clearInterval(int);
  }, []);
  React.useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [events]);
  return (
    <div className={cn('relative rounded-xl border border-neutral-800/70 bg-neutral-950/60 backdrop-blur p-4 font-mono text-[11px] leading-relaxed overflow-hidden', className)}>
      <div ref={ref} className="h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-700/50">
        {events.map(e => (
          <div key={e.id} className={cn('flex items-start gap-2 opacity-90 animate-[fade-up_.45s_ease]',
            e.tone === 'warn' && 'text-amber-300', e.tone === 'err' && 'text-red-400', e.tone === 'ok' && 'text-neutral-300')}>{formatTime(e.t)}<span className="text-neutral-500">—</span>{e.text}</div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-8 pointer-events-none bg-gradient-to-t from-neutral-950 to-transparent" />
    </div>
  );
}

function formatTime(t: number) {
  const d = new Date(t);
  return [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(':');
}
function pad(n: number) { return n.toString().padStart(2, '0'); }
