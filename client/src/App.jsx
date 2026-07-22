import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { getCommentary, getMatches } from './lib/api.js';

const SESSION_KEY = 'sportz.session';

function useSession() {
  const [session, setSession] = useState(() => {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  const updateSession = (nextSession) => {
    setSession(nextSession);
    if (nextSession) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  };

  return [session, updateSession];
}

function formatTime(value) {
  if (!value) return 'TBD';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function statusTone(status) {
  if (status === 'live') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (status === 'finished') return 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30';
  return 'bg-amber-500/15 text-amber-200 border-amber-500/30';
}

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      setError('Enter an email and password to continue.');
      return;
    }
    onLogin({
      email: form.email.trim(),
      name: form.displayName.trim() || form.email.split('@')[0],
    });
    navigate('/app/matches', { replace: true });
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-10">
        <section className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-soft">
          <div className="mb-6">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Sportz
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-white">Sign in</h1>
          </div>

          <form className="space-y-5" onSubmit={submit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">Display name</span>
              <input
                value={form.displayName}
                onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-zinc-600 focus:border-emerald-500"
                placeholder="Alex Morgan"
                autoComplete="name"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-zinc-600 focus:border-emerald-500"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-zinc-600 focus:border-emerald-500"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
            >
              Enter dashboard
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function DashboardLayout({ session, onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Sportz
            </div>
            <div className="text-lg font-semibold text-white">Matches dashboard</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-white">{session?.name}</div>
              <div className="text-xs text-zinc-400">{session?.email}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                onLogout();
                navigate('/login', { replace: true });
              }}
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500 hover:text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Navigation</div>
          <nav className="mt-4 space-y-1">
            <NavLink
              to="/app/matches"
              className={({ isActive }) =>
                [
                  'block rounded-md px-3 py-2 text-sm transition',
                  isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white',
                ].join(' ')
              }
            >
              Matches
            </NavLink>
          </nav>
          <div className="mt-6 rounded-md border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-sm font-medium text-white">Signed in as</div>
            <div className="mt-1 text-sm text-zinc-400">{session?.name}</div>
          </div>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [commentary, setCommentary] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadMatches() {
      try {
        setLoading(true);
        setError('');
        const payload = await getMatches(50);
        if (ignore) return;
        const data = payload?.data ?? [];
        setMatches(data);
        setSelectedMatchId((current) => current ?? data[0]?.id ?? null);
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to load matches.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadMatches();

    return () => {
      ignore = true;
    };
  }, []);

  const selectedMatch = useMemo(
    () => matches.find((match) => String(match.id) === String(selectedMatchId)) ?? null,
    [matches, selectedMatchId]
  );

  useEffect(() => {
    let ignore = false;

    async function loadCommentary() {
      if (!selectedMatchId) {
        setCommentary([]);
        return;
      }

      try {
        setDetailLoading(true);
        const payload = await getCommentary(selectedMatchId, 8);
        if (!ignore) {
          setCommentary(payload?.data ?? []);
        }
      } catch {
        if (!ignore) {
          setCommentary([]);
        }
      } finally {
        if (!ignore) {
          setDetailLoading(false);
        }
      }
    }

    loadCommentary();

    return () => {
      ignore = true;
    };
  }, [selectedMatchId]);

  const filteredMatches = useMemo(() => {
    const search = query.trim().toLowerCase();
    return matches.filter((match) => {
      const statusMatches = statusFilter === 'all' || match.status === statusFilter;
      const teamText = `${match.homeTeam} ${match.awayTeam} ${match.sport}`.toLowerCase();
      return statusMatches && (!search || teamText.includes(search));
    });
  }, [matches, query, statusFilter]);

  const counts = useMemo(
    () =>
      matches.reduce(
        (acc, match) => {
          acc.total += 1;
          acc[match.status] = (acc[match.status] || 0) + 1;
          return acc;
        },
        { total: 0, scheduled: 0, live: 0, finished: 0 }
      ),
    [matches]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Matches</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Total', counts.total],
              ['Scheduled', counts.scheduled],
              ['Live', counts.live],
              ['Finished', counts.finished],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</div>
                <div className="mt-1 text-lg font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search home team, away team, or sport"
            className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500"
          />
          <div className="flex flex-wrap gap-2">
            {['all', 'scheduled', 'live', 'finished'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={[
                  'rounded-md border px-3 py-2 text-sm capitalize transition',
                  statusFilter === status
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                    : 'border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white',
                ].join(' ')}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Match list
            </h3>
          </div>

          {loading ? (
            <div className="p-5 text-sm text-zinc-400">Loading matches...</div>
          ) : filteredMatches.length === 0 ? (
            <div className="p-5 text-sm text-zinc-400">
              No matches found for the current filter.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filteredMatches.map((match) => (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => setSelectedMatchId(match.id)}
                  className={[
                    'flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition',
                    String(match.id) === String(selectedMatchId)
                      ? 'bg-zinc-950/80'
                      : 'hover:bg-zinc-950/60',
                  ].join(' ')}
                >
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      {match.sport}
                    </div>
                    <div className="mt-1 truncate text-base font-semibold text-white">
                      {match.homeTeam} vs {match.awayTeam}
                    </div>
                    <div className="mt-1 text-sm text-zinc-400">{formatTime(match.startTime)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">
                        {match.homeScore ?? 0} - {match.awayScore ?? 0}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">id #{match.id}</div>
                    </div>
                    <span
                      className={[
                        'rounded-full border px-2.5 py-1 text-xs font-medium capitalize',
                        statusTone(match.status),
                      ].join(' ')}
                    >
                      {match.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Match detail
            </h3>
          </div>

          {!selectedMatch ? (
            <div className="p-5 text-sm text-zinc-400">Select a match to view details.</div>
          ) : (
            <div className="space-y-6 p-5">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {selectedMatch.sport}
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {selectedMatch.homeTeam} vs {selectedMatch.awayTeam}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={[
                      'rounded-full border px-2.5 py-1 text-xs font-medium capitalize',
                      statusTone(selectedMatch.status),
                    ].join(' ')}
                  >
                    {selectedMatch.status}
                  </span>
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                    Starts {formatTime(selectedMatch.startTime)}
                  </span>
                </div>
              </div>

              <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Scoreboard</div>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-sm text-zinc-400">{selectedMatch.homeTeam}</div>
                    <div className="text-4xl font-semibold text-white">
                      {selectedMatch.homeScore ?? 0}
                    </div>
                  </div>
                  <div className="pb-2 text-sm text-zinc-500">vs</div>
                  <div className="text-right">
                    <div className="text-sm text-zinc-400">{selectedMatch.awayTeam}</div>
                    <div className="text-4xl font-semibold text-white">
                      {selectedMatch.awayScore ?? 0}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">Recent commentary</div>
                  {detailLoading ? (
                    <div className="text-xs text-zinc-500">Refreshing...</div>
                  ) : null}
                </div>
                <div className="mt-3 space-y-3">
                  {commentary.length === 0 ? (
                    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                      No commentary has been posted for this match yet.
                    </div>
                  ) : (
                    commentary.map((entry) => (
                      <article
                        key={entry.id}
                        className="rounded-md border border-zinc-800 bg-zinc-950 p-4"
                      >
                        <div className="flex items-center justify-between gap-4 text-xs text-zinc-500">
                          <span>
                            {entry.minute != null ? `Minute ${entry.minute}` : 'Live update'}
                          </span>
                          <span>{formatTime(entry.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-zinc-200">{entry.message}</p>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function AppShell() {
  const [session, setSession] = useSession();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={session ? '/app/matches' : '/login'} replace />} />
      <Route
        path="/login"
        element={
          session ? <Navigate to="/app/matches" replace /> : <LoginPage onLogin={setSession} />
        }
      />
      <Route
        path="/app"
        element={
          session ? (
            <DashboardLayout session={session} onLogout={() => setSession(null)} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<Navigate to="matches" replace />} />
        <Route path="matches" element={<MatchesPage />} />
      </Route>
    </Routes>
  );
}

export default AppShell;
