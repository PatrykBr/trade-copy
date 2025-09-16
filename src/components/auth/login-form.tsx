"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

interface LoginFormProps {
  className?: string;
  onSuccess?: () => void;
}

export function LoginForm({ className, onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      } else {
        onSuccess?.();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-5', className)}>
      {error && (
        <div className="text-sm rounded-md border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-neutral-400">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className="w-full rounded-md bg-neutral-800/60 border border-neutral-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 disabled:opacity-50"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-xs font-medium uppercase tracking-wide text-neutral-400 flex justify-between">
          <span>Password</span>
          <button type="button" onClick={() => setShowPassword(s => !s)} className="text-[10px] font-normal text-neutral-500 hover:text-neutral-300 transition-colors">
            {showPassword ? 'HIDE' : 'SHOW'}
          </button>
        </label>
        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          className="w-full rounded-md bg-neutral-800/60 border border-neutral-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 disabled:opacity-50"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium h-10 transition focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_0_1px_rgba(255,255,255,0.05)] hover:from-cyan-400 hover:to-blue-500"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
}