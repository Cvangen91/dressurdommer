'use client';

import { useEffect, useMemo, useState } from 'react';

type Member = {
  id: string;
  full_name: string;
  judge_level: string | null;
  rider_district: string | null;
  requested_at: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('nb-NO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AdminMembersPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [rejectOpenId, setRejectOpenId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => (m.full_name || '').toLowerCase().includes(q));
  }, [members, query]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/members/pending', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Kunne ikke hente medlemmer');
      setMembers(json.members ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Ukjent feil');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    const res = await fetch(`/api/admin/members/${id}/approve`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return alert(json?.error || 'Kunne ikke godkjenne');
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  async function reject(id: string) {
    const res = await fetch(`/api/admin/members/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return alert(json?.error || 'Kunne ikke avvise');

    setMembers((prev) => prev.filter((m) => m.id !== id));
    setRejectOpenId(null);
    setRejectReason('');
  }

  return (
    <>
      <section className="card">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[--deep-sea]">Nye medlemmer</h1>
            <p className="text-sm text-muted mt-1">
              Ventende godkjenninger: <span className="font-semibold">{members.length}</span>
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="w-full md:w-[280px]">
              <label className="label">Søk</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Søk på navn..."
                className="input"
              />
            </div>

            <button onClick={load} className="btn btn-secondary md:self-end">
              Oppdater
            </button>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <p className="text-muted">Laster…</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted">Ingen ventende medlemmer 🎉</p>
          ) : (
            <div className="space-y-4">
              {filtered.map((m) => (
                <div key={m.id} className="card">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-[--deep-sea]">{m.full_name}</p>

                        {m.judge_level ? (
                          <span className="badge badge-pending">{m.judge_level}</span>
                        ) : null}

                        <span className="badge badge-pending">Pågår</span>
                      </div>

                      <p className="text-sm text-muted mt-1">
                        {m.rider_district || 'Ukjent region'}
                        <span className="mx-2">•</span>
                        Sendt: {formatDate(m.requested_at || m.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                      <button onClick={() => approve(m.id)} className="btn btn-primary">
                        Godkjenn
                      </button>

                      <button
                        onClick={() => {
                          setRejectOpenId(m.id);
                          setRejectReason('');
                        }}
                        className="btn btn-secondary"
                      >
                        Avvis
                      </button>
                    </div>
                  </div>

                  {rejectOpenId === m.id ? (
                    <div className="mt-4 border rounded-md p-3">
                      <p className="text-sm font-medium text-[--deep-sea]">Avvis medlem</p>
                      <p className="text-xs text-muted mt-1">Valgfritt: legg inn begrunnelse</p>

                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="input mt-2 min-h-[90px]"
                        placeholder="F.eks. Ikke dressurdommer / mangler dokumentasjon…"
                      />

                      <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:justify-end">
                        <button onClick={() => setRejectOpenId(null)} className="btn btn-secondary">
                          Avbryt
                        </button>
                        <button onClick={() => reject(m.id)} className="btn btn-primary">
                          Bekreft avvisning
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
