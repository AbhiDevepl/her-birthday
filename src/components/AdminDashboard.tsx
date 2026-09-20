import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, LogOut, CheckCircle2, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react';

interface Visitor {
  id: number | string;
  nickname: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp?: string | null;
  address?: string | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  user_agent?: string | null;
  createdAt: string;
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        onSuccess();
      } else {
        setError(data?.error || 'Invalid credentials.');
      }
    } catch {
      setError('Unable to reach authentication server. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-sm w-full bg-white p-8 polaroid-shadow rounded-sm flex flex-col gap-4 border border-kraft/30">
      <div className="flex items-center gap-2 text-crimson">
        <ShieldCheck className="w-8 h-8" />
        <h1 className="font-cursive text-4xl font-bold">Admin Login</h1>
      </div>
      <p className="font-sans text-xs text-on-surface-variant">
        Sign in to view real-time visitor records from persistent database storage.
      </p>

      <label className="font-sans text-xs uppercase tracking-widest text-kraft font-semibold" htmlFor="admin-user">
        Username
      </label>
      <input
        id="admin-user"
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="font-serif px-4 py-3 bg-[#FAF0E6] border border-dashed border-kraft/60 rounded-sm outline-none focus:border-crimson"
      />

      <label className="font-sans text-xs uppercase tracking-widest text-kraft font-semibold" htmlFor="admin-pass">
        Password
      </label>
      <input
        id="admin-pass"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="font-serif px-4 py-3 bg-[#FAF0E6] border border-dashed border-kraft/60 rounded-sm outline-none focus:border-crimson"
      />

      {error && (
        <p role="alert" className="font-sans text-xs text-dark-red bg-blush/30 border border-dark-red/30 p-2 rounded-sm">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="font-cursive text-2xl bg-radial from-[#C41E3A] to-[#8B0000] text-cream font-bold py-2.5 rounded-sm disabled:opacity-60 cursor-pointer hover:shadow-md transition-shadow"
      >
        {busy ? 'Verifying…' : 'Sign in'}
      </button>
    </form>
  );
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [visitors, setVisitors] = useState<Visitor[] | null>(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const isFetchingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Poll or fetch visitor records from serverless persistent database
  const fetchVisitors = useCallback(async (isManual = false) => {
    // Prevent overlapping requests
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isManual) {
      setIsRefreshing(true);
    }

    try {
      const res = await fetch('/api/admin/visitors', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!isMountedRef.current) return;

      if (res.status === 401) {
        setAuthed(false);
        setIsLive(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const body = await res.json();
      if (!isMountedRef.current) return;

      if (Array.isArray(body.visitors)) {
        setVisitors(body.visitors);
        setAuthed(true);
        setError('');
        setIsLive(true);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setIsLive(false);
      setError(err?.message || 'Failed to sync with visitor database');
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current && isManual) {
        setIsRefreshing(false);
      }
    }
  }, []);

  // Lifecycle: initial fetch + polling every 6 seconds
  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch immediately
    fetchVisitors();

    // Prevent duplicate polling intervals
    const intervalId = setInterval(() => {
      fetchVisitors();
    }, 6000);

    // Clear polling on unmount
    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchVisitors]);

  const logout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // ignore network errors on logout
    }
    setAuthed(false);
    setVisitors(null);
    setIsLive(false);
  };

  if (authed === false) {
    return (
      <div className="min-h-screen paper-bg flex items-center justify-center p-6">
        <LoginForm onSuccess={() => fetchVisitors(true)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen paper-bg p-4 md:p-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <header className="flex flex-wrap gap-4 justify-between items-center bg-white p-6 rounded-sm polaroid-shadow border border-kraft/30">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-cursive text-4xl md:text-5xl text-crimson font-bold">Admin Dashboard</h1>
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Connecting…
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-xs font-sans text-on-surface-variant mt-2">
              <span>
                Total Visitors: <strong>{visitors?.length ?? '—'}</strong>
              </span>
              {lastUpdated && <span>Last updated: <strong>{lastUpdated}</strong></span>}
              <span className="text-kraft">● Polling interval: 6s</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchVisitors(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold px-3.5 py-2 border border-crimson text-crimson rounded-sm hover:bg-crimson hover:text-cream transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold px-3.5 py-2 border border-kraft text-kraft rounded-sm hover:bg-kraft hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="font-sans text-xs text-dark-red bg-blush/30 border border-dark-red/30 rounded-sm px-4 py-3 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => fetchVisitors(true)} className="underline font-semibold ml-2">Retry</button>
          </div>
        )}

        {visitors === null && !error && (
          <div className="bg-white p-8 rounded-sm polaroid-shadow text-center font-serif text-on-surface-variant">
            Connecting to Vercel Serverless Function & persistent database…
          </div>
        )}

        {visitors?.length === 0 && !error && (
          <div className="bg-white p-8 rounded-sm polaroid-shadow text-center">
            <p className="font-serif text-charcoal font-semibold text-lg">No visitor records yet.</p>
            <p className="font-sans text-xs text-on-surface-variant mt-1">
              Visitors will appear here in real time as they complete location check-in.
            </p>
          </div>
        )}

        {!!visitors?.length && (
          <div className="bg-white polaroid-shadow rounded-sm overflow-x-auto border border-kraft/20">
            <table className="w-full text-left font-sans text-sm">
              <thead className="bg-[#FAF0E6] text-kraft uppercase text-xs tracking-widest border-b border-kraft/30">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Nickname</th>
                  <th className="px-4 py-3">Coordinates</th>
                  <th className="px-4 py-3">Accuracy</th>
                  <th className="px-4 py-3">Address / Area</th>
                  <th className="px-4 py-3">Registered At</th>
                  <th className="px-4 py-3 text-right">Map</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v, index) => (
                  <tr key={v.id} className="border-t border-kraft/15 hover:bg-cream/40 transition-colors">
                    <td className="px-4 py-3 text-xs text-on-surface-variant/70 font-mono">
                      {visitors.length - index}
                    </td>
                    <td className="px-4 py-3 font-semibold text-charcoal flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {v.nickname}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-charcoal">
                      {Number(v.latitude).toFixed(4)}, {Number(v.longitude).toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {v.accuracy != null ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                          ±{Math.round(v.accuracy)}m
                        </span>
                      ) : (
                        <span className="text-on-surface-variant/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-charcoal max-w-[240px]" title={v.address || ''}>
                      {v.area || v.city ? (
                        <div>
                          <div className="font-semibold text-charcoal truncate">
                            {[v.area, v.city].filter(Boolean).join(', ')}
                          </div>
                          {v.country && (
                            <div className="text-[11px] text-on-surface-variant truncate">
                              {[v.state, v.country].filter(Boolean).join(', ')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-on-surface-variant/60 truncate block">{v.address || '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-on-surface-variant font-mono">
                      {new Date(v.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-crimson hover:underline text-xs"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
