'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push('/control-7v9k2m4q');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0e1628] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/10">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-wider">
            Organizer Admin Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Private event operations access
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Event passkey
            </label>
            <input
              type="password"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter the organizer passkey"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-400"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-900/60 p-3 text-[11px] text-slate-400">
            <Shield className="h-3.5 w-3.5 shrink-0 text-blue-400" />
            Authorized event staff only. Login activity may be recorded.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Organizer Panel'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
