"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

interface SignupFormProps {
  className?: string;
  onSuccess?: () => void;
}

export function SignupForm({ className, onSuccess }: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        onSuccess?.();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={cn('space-y-4 text-center', className)}>
        <h2 className="text-xl font-semibold text-neutral-100">Verify your email</h2>
        <p className="text-sm text-neutral-400">We sent a confirmation link to</p>
        <p className="text-sm font-medium text-neutral-200 break-all">{email}</p>
        <p className="text-xs text-neutral-500">Open the link to activate your account.</p>
      </div>
    );
  }

  const inputClass = 'w-full rounded-md bg-neutral-800/60 border border-neutral-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 disabled:opacity-50';
  const labelClass = 'text-xs font-medium uppercase tracking-wide text-neutral-400';

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-5', className)}>
      {error && (
        <div className="text-sm rounded-md border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <label htmlFor="fullName" className={labelClass}>Full Name</label>
        <input
          id="fullName"
          type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            className={inputClass}
            placeholder="Jane Trader"
            autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="email" className={labelClass}>Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className={inputClass}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <label className={labelClass + ' flex justify-between'} htmlFor="password">
          <span>Password</span>
          <button type="button" onClick={() => setShowPasswords(s => !s)} className="text-[10px] font-normal text-neutral-500 hover:text-neutral-300 transition-colors">
            {showPasswords ? 'HIDE' : 'SHOW'}
          </button>
        </label>
        <input
          id="password"
          type={showPasswords ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          className={inputClass}
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="confirmPassword" className={labelClass}>Confirm Password</label>
        <input
          id="confirmPassword"
          type={showPasswords ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={loading}
          className={inputClass}
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium h-10 transition focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_0_1px_rgba(255,255,255,0.05)] hover:from-cyan-400 hover:to-blue-500"
      >
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
      <p className="text-[11px] text-neutral-500 text-center">Password must be at least 6 characters.</p>
    </form>
  );
}