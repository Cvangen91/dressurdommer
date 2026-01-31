'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { OBSERVATION_STATUS_LABELS, OBSERVATION_YEAR_STATUS_LABELS } from '@/lib/statusLabels';

interface ObservationYear {
  id: string;
  year: number;
  status: 'open' | 'closed';
}

interface Observation {
  id: string;
  date: string;
  location: string;
  class_level: string;
  number_of_horses: number;
  host_name: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function ObservationsPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState<ObservationYear | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      let { data: yearData, error: yearError } = await supabase
        .from('observation_year')
        .select('*')
        .eq('observer_id', user.id)
        .eq('year', currentYear)
        .single();

      if (!yearData && yearError?.code === 'PGRST116') {
        const { data: newYear, error: insertError } = await supabase
          .from('observation_year')
          .insert({
            observer_id: user.id,
            year: currentYear,
          })
          .select()
          .single();

        if (insertError) {
          setError('Could not create observation year');
          setLoading(false);
          return;
        }

        yearData = newYear;
      }

      if (!yearData) {
        setError('Could not load observation year');
        setLoading(false);
        return;
      }

      const { data: obsData, error: obsError } = await supabase
        .from('observations')
        .select('id, date, location, class_level, number_of_horses, status, host_name')
        .eq('observation_year_id', yearData.id)
        .order('date', { ascending: false });

      if (obsError) {
        setError('Could not load observations');
      } else {
        setObservations(obsData ?? []);
      }

      setYear(yearData);
      setLoading(false);
    };

    load();
  }, [router, currentYear]);

  if (loading) {
    return <p className="p-6">Laster inn…</p>;
  }

  if (error) {
    return <p className="p-6 text-red-600">{error}</p>;
  }

  if (!year) {
    return null;
  }

  const isLocked = year.status !== 'open';

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <section className="card">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Bisitting – {year.year}</h1>

          {!isLocked && (
            <button
              onClick={() => router.push(`/observations/${year.id}/new`)}
              className="px-4 py-2 rounded bg-black text-white"
            >
              + Registrer bisitting
            </button>
          )}
        </div>

        <div className="mb-6">
          <span className="inline-block px-3 py-1 rounded bg-gray-100 text-sm">
            Status: {OBSERVATION_YEAR_STATUS_LABELS[year.status]}
          </span>
        </div>

        {observations.length === 0 ? (
          <div className="text-gray-500 border rounded p-6">Ingen bisittinger registrert.</div>
        ) : (
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Dato</th>
                  <th className="text-left p-3">Sted</th>
                  <th className="text-left p-3">Klasse</th>
                  <th className="text-left p-3">Antall ekvipasjer</th>
                  <th className="text-left p-3">Dommer</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((obs) => (
                  <tr key={obs.id} className="border-t">
                    <td className="p-3">{obs.date}</td>
                    <td className="p-3">{obs.location}</td>
                    <td className="p-3">{obs.class_level}</td>
                    <td className="p-3">{obs.number_of_horses}</td>
                    <td className="p-3">{obs.host_name}</td>
                    <td className="p-3">{OBSERVATION_STATUS_LABELS[obs.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLocked && observations.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => router.push(`/observations/${year.id}/submit`)}
              className="px-4 py-2 rounded bg-green-600 text-white"
            >
              Send inn bisittingsskjema for {year.year}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
