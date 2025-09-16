"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [showReset, setShowReset] = useState(false);

  const handleLoginSuccess = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Marketing Side */}
      <div className="relative hidden lg:flex w-1/2 flex-col justify-between border-r border-neutral-800/60 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-950 p-12 overflow-hidden">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-50 mb-4">Faster replication. Tighter control.</h2>
          <p className="text-neutral-400 max-w-md text-sm leading-relaxed">Centralize multi-account execution with deterministic replication, programmable risk layers and transparent performance intelligence.</p>
          <ul className="mt-8 space-y-3 text-sm text-neutral-300">
            {['Sub-30ms average latency','Adaptive scaling + filters','Drawdown & news protections','Unified P&L analytics'].map(point => (
              <li key={point} className="flex gap-2 items-start"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" /> {point}</li>
            ))}
          </ul>
        </div>
        <div className="text-xs text-neutral-600">Encrypted credentials • Granular isolation • Audit trails</div>
        <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.15),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(14,165,233,0.15),transparent_65%)]" />
      </div>

      {/* Form Column */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md relative">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-100">Sign in</h1>
            <p className="mt-2 text-sm text-neutral-400">Access your console</p>
          </div>
          <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/60 backdrop-blur p-6">
            <LoginForm onSuccess={handleLoginSuccess} />
            <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
              <button onClick={() => setShowReset(!showReset)} className="hover:text-neutral-300 transition-colors">{showReset ? 'Hide reset options' : 'Forgot password?'}</button>
              <Link href="/signup" className="hover:text-neutral-300 transition-colors">Create account</Link>
            </div>
            {showReset && (
              <div className="mt-4 text-xs text-neutral-400">
                Password reset instructions will be sent to your email if it exists in our system.
              </div>
            )}
          </div>
          <div className="mt-6 text-center text-[11px] text-neutral-600">
            By continuing you agree to our <a className="underline hover:text-neutral-400" href="#">Terms</a> & <a className="underline hover:text-neutral-400" href="#">Privacy</a>.
          </div>
        </div>
      </div>
    </div>
  );
}