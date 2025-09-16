'use client';

import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

export function DashboardHeader() {
  const { user, profile, signOut } = useAuth();
  return (
    <div>
      <div>
        <div>
          <div>
            <Link href="/dashboard">TradeCopy</Link> |{' '}
            <Link href="/dashboard">Dashboard</Link> |{' '}
            <Link href="/accounts">Accounts</Link> |{' '}
            <Link href="/analytics">Analytics</Link>
          </div>
          <div>
            <span>{profile?.full_name || user?.email}</span>
            <button onClick={signOut}>Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  );
}