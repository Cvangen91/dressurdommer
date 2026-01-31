'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface PendingObservation {
  id: string;
  date: string;
  location: string;
  class_level: string;
  number_of_horses: number;
  observer_name: string;
}

export default function ApprovalsPage() {
  const router = useRouter();

  const [observations, setObservations] = useState<PendingObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rejectComment, setRejectComment] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    const loadApprovals = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      /**
       * Henter bisittinger:
       * - der denne brukeren er host_user_id
       * - som venter på bekreftelse
       */
      const { data, error } = await supabase
        .from('observations')
        .select(
          `
          id,
          date,
          location,
          class_level,
          number_of_horses,
          observer_name
        `
        )
        .eq('host_user_id', user.id)
        .eq('status', 'pending')
        .order('date', { ascending: false });

      if (error) {
        setError('Kunne ikke laste bisittinger.');
      } else {
        const mapped = (data ?? []).map((o: any) => ({
          id: o.id,
          date: o.date,
          location: o.location,
          class_level: o.class_level,
          number_of_horses: o.number_of_horses,
          observer_name: o.observer_name ?? 'Ukjent dommer',
        }));

        setObservations(mapped);
      }

      setLoading(false);
    };

    loadApprovals();
  }, [router]);

  const handleDecision = async (id: string, approved: boolean) => {
    if (!approved) return;

    const { error } = await supabase
      .from('observations')
      .update({ status: 'approved' })
      .eq('id', id);

    if (error) {
      alert('Noe gikk galt ved godkjenning.');
      return;
    }

    await supabase.from('notifications').update({ is_read: true }).eq('observation_id', id);

    setObservations((prev) => prev.filter((o) => o.id !== id));
  };

  const handleReject = async (id: string) => {
    if (!rejectComment.trim()) {
      alert('Kommentar er påkrevd ved avvisning.');
      return;
    }

    const { error } = await supabase
      .from('observations')
      .update({
        status: 'rejected',
        rejection_comment: rejectComment,
      })
      .eq('id', id);

    if (error) {
      alert('Kunne ikke avvise bisittingen.');
      return;
    }

    await supabase.from('notifications').update({ is_read: true }).eq('observation_id', id);

    setObservations((prev) => prev.filter((o) => o.id !== id));
    setRejectingId(null);
    setRejectComment('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <section className="card">
        <h1 className="text-2xl font-semibold mb-4">Bisittinger til godkjenning</h1>

        {loading ? (
          <p className="text-muted">Laster…</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : observations.length === 0 ? (
          <p className="text-muted">Du har ingen bisittinger som venter på bekreftelse.</p>
        ) : (
          <div className="space-y-4">
            {observations.map((obs) => (
              <div key={obs.id} className="border rounded-lg p-4">
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-[--deep-sea]">{obs.observer_name}</p>
                  <p>
                    <span className="font-medium">Dato:</span>{' '}
                    {new Date(obs.date).toLocaleDateString('no-NO')}
                  </p>
                  <p>
                    <span className="font-medium">Sted:</span> {obs.location}
                  </p>
                  <p>
                    <span className="font-medium">Klasse:</span> {obs.class_level}
                  </p>
                  <p>
                    <span className="font-medium">Antall ekvipasjer:</span> {obs.number_of_horses}
                  </p>
                </div>

                <div className="flex flex-col gap-3 mt-4">
                  {rejectingId === obs.id && (
                    <div className="space-y-2">
                      <textarea
                        className="input"
                        rows={3}
                        placeholder="Begrunn hvorfor bisittingen avvises"
                        value={rejectComment}
                        onChange={(e) => setRejectComment(e.target.value)}
                      />
                      <p className="text-xs text-muted">Kommentar er obligatorisk ved avvisning</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDecision(obs.id, true)}
                      className="btn btn-primary"
                    >
                      Godkjenn
                    </button>

                    {rejectingId === obs.id ? (
                      <button onClick={() => handleReject(obs.id)} className="btn btn-secondary">
                        Send avvisning
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setRejectingId(obs.id);
                          setRejectComment('');
                        }}
                        className="btn btn-secondary"
                      >
                        Avvis
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
