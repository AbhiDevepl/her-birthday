import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Visitor {
  id: number;
  nickname: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  createdAt: string;
}

const POLL_INTERVAL_MS = 5000;
const NEW_VISITOR_BANNER_MS = 4000;

type AuthState = 'checking' | 'authed' | 'unauth';
type LiveStatus = 'loading' | 'live' | 'refreshing' | 'error';

function formatVisitedTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function StatusBadge({ status, lastUpdated }: { status: LiveStatus; lastUpdated: Date | null }) {
  if (status === 'loading') {
    return <span className="font-sans text-xs text-on-surface-variant">Loading visitors…</span>;
  }
  if (status === 'refreshing') {
    return <span className="font-sans text-xs text-kraft">Refreshing…</span>;
  }
  if (status === 'error') {
    return (
      <span className="font-sans text-xs text-dark-red">
        Connection error — Retrying…
      </span>
    );
  }
  return (
    <span className="font-sans text-xs text-emerald-800 flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
      <span>
        Live
        {lastUpdated && (
          <span className="text-on-surface-variant"> — Last updated: {lastUpdated.toLocaleTimeString()}</span>
        )}
      </span>
    </span>
  );
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
        cache: 'no-store',
      });
      if (res.ok) {
        onSuccess();
      } else {
        setError('Invalid username or password.');
      }
    } catch {
      setError('Connection error. Is the backend reachable?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-sm w-full bg-white p-8 polaroid-shadow rounded-sm flex flex-col gap-4">
      <h1 className="font-cursive text-4xl text-crimson font-bold">Admin Login</h1>
      <label className="font-sans text-xs uppercase tracking-widest text-kraft font-semibold" htmlFor="admin-user">
        Username
      </label>
      <input
        id="admin-user" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)}
        className="font-serif px-4 py-3 bg-[#FAF0E6] border border-dashed border-kraft/60 rounded-sm outline-none focus:border-crimson"
      />
      <label className="font-sans text-xs uppercase tracking-widest text-kraft font-semibold" htmlFor="admin-pass">
        Password
      </label>
      <input
        id="admin-pass" type="password" autoComplete="current-password" required
        value={password} onChange={(e) => setPassword(e.target.value)}
        className="font-serif px-4 py-3 bg-[#FAF0E6] border border-dashed border-kraft/60 rounded-sm outline-none focus:border-crimson"
      />
      {error && <p role="alert" className="font-sans text-sm text-dark-red">{error}</p>}
      <button
        type="submit" disabled={busy}
        className="font-cursive text-2xl bg-radial from-[#C41E3A] to-[#8B0000] text-cream font-bold py-2.5 rounded-sm disabled:opacity-60 cursor-pointer"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

export default function AdminDashboard() {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('loading');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newVisitor, setNewVisitor] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState('');

  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const prevTopRef = useRef<{ id: number; createdAt: string } | null>(null);
  const bannerTimerRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (bannerTimerRef.current != null) {
        window.clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = null;
      }
    };
  }, []);

  // Backend determines the session: /api/admin/me returns 200 only when a valid
  // HMAC-signed admin_session cookie is present. No client-side fallback auth.
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/admin/me', { cache: 'no-store', signal: ctrl.signal });
        if (!mountedRef.current) return;
        setAuthState(res.ok ? 'authed' : 'unauth');
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        if (!mountedRef.current) return;
        setAuthState('unauth');
      }
    })();
    return () => ctrl.abort();
  }, []);

  const load = useCallback(async () => {
    if (!mountedRef.current || inFlightRef.current) return;
    inFlightRef.current = true;
    setLiveStatus((prev) => (prev === 'live' ? 'refreshing' : prev));
    try {
      const res = await fetch('/api/admin/visitors', {
        cache: 'no-store',
        signal: abortRef.current?.signal,
      });
      if (!mountedRef.current) return;
      if (res.status === 401) {
        setAuthState('unauth');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (!mountedRef.current) return;
      if (!body || !Array.isArray(body.visitors)) throw new Error('Unexpected admin response');
      const next: Visitor[] = body.visitors;
      setVisitors(next);
      setLiveStatus('live');
      setLastUpdated(new Date());
      setLoadingError('');

      const top = next.length ? next[0] : null;
      const prev = prevTopRef.current;
      if (prev && top && (top.id !== prev.id || top.createdAt !== prev.createdAt)) {
        setNewVisitor(top.nickname);
        if (bannerTimerRef.current != null) window.clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = window.setTimeout(() => {
          bannerTimerRef.current = null;
          if (mountedRef.current) setNewVisitor(null);
        }, NEW_VISITOR_BANNER_MS);
      }
      prevTopRef.current = top ? { id: top.id, createdAt: top.createdAt } : null;
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      if (mountedRef.current) {
        setLiveStatus('error');
        setLoadingError('Connection error');
      }
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  // Poll while authenticated: immediate fetch, then every POLL_INTERVAL_MS.
  // The interval keeps running regardless of in-flight state; load()'s own
  // guard prevents overlapping requests. Cleanup clears interval + aborts.
  useEffect(() => {
    if (authState !== 'authed') return;

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    inFlightRef.current = false;
    prevTopRef.current = null; // first poll after auth is the baseline (no "new" banner)
    setLiveStatus('loading');
    setLoadingError('');

    load();

    const timer = window.setInterval(() => {
      load();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      inFlightRef.current = false;
      ctrl.abort();
      if (bannerTimerRef.current != null) {
        window.clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = null;
      }
    };
  }, [authState, load]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST', cache: 'no-store' });
    } catch {
      // Session is dropped client-side regardless of backend reachability.
    }
    setAuthState('unauth');
    setVisitors([]);
    setLiveStatus('loading');
    setNewVisitor(null);
  };

  if (authState === 'checking') {
    return (
      <div className="min-h-screen paper-bg flex items-center justify-center p-6">
        <p className="font-serif text-on-surface-variant">Checking session…</p>
      </div>
    );
  }

  if (authState === 'unauth') {
    return (
      <div className="min-h-screen paper-bg flex items-center justify-center p-6">
        <LoginForm onSuccess={() => setAuthState('authed')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen paper-bg p-4 md:p-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <header className="flex flex-wrap gap-3 justify-between items-center">
          <div>
            <h1 className="font-cursive text-4xl md:text-5xl text-crimson font-bold">Admin Dashboard</h1>
            <p className="font-sans text-sm text-on-surface-variant">
              Total Visitors: <strong>{visitors.length}</strong>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <button onClick={load} className="font-sans text-sm font-semibold px-4 py-2 border-2 border-crimson text-crimson rounded-sm hover:bg-crimson hover:text-cream transition-colors cursor-pointer">
                Refresh
              </button>
              <button onClick={handleLogout} className="font-sans text-sm font-semibold px-4 py-2 border-2 border-kraft text-kraft rounded-sm hover:bg-kraft hover:text-white transition-colors cursor-pointer">
                Log out
              </button>
            </div>
            <StatusBadge status={liveStatus} lastUpdated={lastUpdated} />
          </div>
        </header>

        {newVisitor && (
          <div role="status" className="flex items-center gap-2 font-sans text-sm text-emerald-900 bg-emerald-50 border border-emerald-300/60 rounded-sm px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            New visitor received: <strong>{newVisitor}</strong>
          </div>
        )}

        {loadingError && (
          <p role="alert" className="font-sans text-sm text-dark-red bg-blush/30 border border-dark-red/30 rounded-sm px-3 py-2">
            {loadingError} — retrying automatically.
          </p>
        )}

        {authState === 'authed' && liveStatus === 'loading' && visitors.length === 0 && (
          <p className="font-serif text-on-surface-variant bg-white p-6 rounded-sm polaroid-shadow">Loading visitors…</p>
        )}

        {authState === 'authed' && liveStatus !== 'loading' && visitors.length === 0 && (
          <p className="font-serif text-on-surface-variant bg-white p-6 rounded-sm polaroid-shadow">
            No visitor records yet.
          </p>
        )}

        {visitors.length > 0 && (
          <div className="bg-white polaroid-shadow rounded-sm overflow-x-auto">
            <table className="w-full text-left font-sans text-sm">
              <thead className="bg-[#FAF0E6] text-kraft uppercase text-xs tracking-widest">
                <tr>
                  <th className="px-4 py-3">Nickname</th>
                  <th className="px-4 py-3">Coordinates</th>
                  <th className="px-4 py-3">Accuracy</th>
                  <th className="px-4 py-3">Address / Area</th>
                  <th className="px-4 py-3">Visited</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => (
                  <tr key={v.id} className="border-t border-kraft/20">
                    <td className="px-4 py-3 font-semibold text-charcoal">{v.nickname}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {v.accuracy != null ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                          ±{v.accuracy}m
                        </span>
                      ) : (
                        <span className="text-on-surface-variant/60">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-charcoal max-w-[200px] truncate" title={v.address || ''}>
                      {v.city && v.country
                        ? `${v.city}, ${v.country}`
                        : v.address || <span className="text-on-surface-variant/60">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-on-surface-variant" title="Registration time">
                      {formatVisitedTime(v.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-crimson underline whitespace-nowrap hover:text-dark-red text-xs"
                      >
                        View Map
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