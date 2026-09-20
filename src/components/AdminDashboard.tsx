import React, { useCallback, useEffect, useState } from 'react';

interface Visitor {
  id: number;
  nickname: string;
  latitude: number;
  longitude: number;
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

    let isSuccess = false;
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data?.ok) {
          isSuccess = true;
        }
      }
    } catch {
      // Backend not reached, will check fallback below
    }

    // Fallback authentication for offline or static deployments
    if (!isSuccess) {
      if (username === 'admin' && password === 'om1234') {
        isSuccess = true;
      }
    }

    if (isSuccess) {
      sessionStorage.setItem('local_admin_authed', 'true');
      onSuccess();
    } else {
      setError('Invalid username or password.');
    }
    setBusy(false);
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
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [visitors, setVisitors] = useState<Visitor[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setVisitors(null);

    // Read any offline/fallback visitors saved in localStorage
    const getOfflineVisitors = (): Visitor[] => {
      try {
        const raw = localStorage.getItem('offlineVisitors');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    };

    try {
      const res = await fetch('/api/admin/visitors');
      const contentType = res.headers.get('content-type') || '';

      if (res.status === 401) {
        sessionStorage.removeItem('local_admin_authed');
        setAuthed(false);
        return;
      }

      let serverList: Visitor[] = [];
      let isBackendAuthed = false;

      if (res.ok && contentType.includes('application/json')) {
        try {
          const body = await res.json();
          if (body && Array.isArray(body.visitors)) {
            serverList = body.visitors;
            isBackendAuthed = true;
          }
        } catch {
          // Ignore JSON parse issue on corrupted responses
        }
      }

      const isLocalAuthed = sessionStorage.getItem('local_admin_authed') === 'true';
      if (!isBackendAuthed && !isLocalAuthed) {
        setAuthed(false);
        return;
      }

      setAuthed(true);
      const offlineList = getOfflineVisitors();
      
      // Combine and deduplicate by timestamp/id
      const idSet = new Set(serverList.map((v) => v.id));
      const combined = [...serverList];
      for (const off of offlineList) {
        if (!idSet.has(off.id)) {
          combined.push(off);
        }
      }
      combined.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setVisitors(combined);
    } catch {
      const isLocalAuthed = sessionStorage.getItem('local_admin_authed') === 'true';
      if (isLocalAuthed) {
        setAuthed(true);
        setVisitors(getOfflineVisitors());
      } else {
        setAuthed(false);
      }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const logout = async () => {
    sessionStorage.removeItem('local_admin_authed');
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setAuthed(false);
    setVisitors(null);
  };

  if (authed === false) {
    return (
      <div className="min-h-screen paper-bg flex items-center justify-center p-6">
        <LoginForm onSuccess={load} />
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
              Total Visitors: <strong>{visitors?.length ?? '—'}</strong>
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="font-sans text-sm font-semibold px-4 py-2 border-2 border-crimson text-crimson rounded-sm hover:bg-crimson hover:text-cream transition-colors cursor-pointer">
              Refresh
            </button>
            <button onClick={logout} className="font-sans text-sm font-semibold px-4 py-2 border-2 border-kraft text-kraft rounded-sm hover:bg-kraft hover:text-white transition-colors cursor-pointer">
              Log out
            </button>
          </div>
        </header>

        {error && <p role="alert" className="font-sans text-sm text-dark-red bg-blush/30 border border-dark-red/30 rounded-sm px-3 py-2">{error}</p>}

        {visitors === null && !error && <p className="font-serif text-on-surface-variant">Loading visitors…</p>}

        {visitors?.length === 0 && !error && (
          <p className="font-serif text-on-surface-variant bg-white p-6 rounded-sm polaroid-shadow">No visitor records yet.</p>
        )}

        {!!visitors?.length && (
          <div className="bg-white polaroid-shadow rounded-sm overflow-x-auto">
            <table className="w-full text-left font-sans text-sm">
              <thead className="bg-[#FAF0E6] text-kraft uppercase text-xs tracking-widest">
                <tr>
                  <th className="px-4 py-3">Nickname</th>
                  <th className="px-4 py-3">Latitude</th>
                  <th className="px-4 py-3">Longitude</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => (
                  <tr key={v.id} className="border-t border-kraft/20">
                    <td className="px-4 py-3 font-semibold">{v.nickname}</td>
                    <td className="px-4 py-3">{v.latitude.toFixed(4)}</td>
                    <td className="px-4 py-3">{v.longitude.toFixed(4)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(v.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-crimson underline whitespace-nowrap"
                      >
                        View Location
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
