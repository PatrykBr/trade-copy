"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems: { href: string; label: string; auth?: boolean }[] = [
  { href: '/#features', label: 'Features' },
  { href: '/dashboard', label: 'Dashboard', auth: true },
  { href: '/accounts', label: 'Accounts', auth: true },
  { href: '/analytics', label: 'Analytics', auth: true },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70 border-b border-neutral-800/60">
      <div className="container-page h-16 flex items-center gap-6">
        <Link href="/" className="font-semibold text-neutral-100 tracking-tight flex items-center gap-2">
          <span className="relative inline-flex items-center justify-center h-7 w-7 rounded-md bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-medium">TC</span>
          <span>TradeCopy Pro</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {navItems
            .filter(n => !n.auth || user)
            .map(item => {
              const active = pathname === item.href || (item.href.startsWith('/#') && pathname === '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3 py-2 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors',
                    active && 'text-neutral-100 bg-neutral-800/70'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {!user && (
            <>
              <Button asChild variant="ghost" size="sm" className="text-neutral-300">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" variant="gradient">
                <Link href="/signup">Get Started</Link>
              </Button>
            </>
          )}
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col leading-tight text-xs text-neutral-400">
                <span className="text-neutral-200 font-medium truncate max-w-[140px]">{profile?.full_name || user.email}</span>
                <span className="uppercase tracking-wide">Account</span>
              </div>
              <Button size="sm" variant="outline" onClick={signOut} className="bg-neutral-900/60">Sign out</Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
