'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function NewObservationPage() {
  const router = useRouter();
  const params = useParams();
  const yearId = params.yearId as string;

  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [numberOfHorses, setNumberOfHorses] = useState<number | ''>('');
  const [resultListUrl, setResultListUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hostName, setHostName] = useState('');
  const [hostUserId, setHostUserId] = useState<string | null>(null);

  const [showJudgeDropdown, setShowJudgeDropdown] = useState(false);
  const [judgeSuggestions, setJudgeSuggestions] = useState<
    { user_id: string; full_name: string }[]
  >([]);

  useEffect(() => {
    const loadJudges = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .not('full_name', 'is', null);

      if (data) setJudgeSuggestions(data);
    };

    loadJudges();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const observerName = profileData?.full_name ?? 'En dommer';

    const { data: insertedObservation, error: insertError } = await supabase
      .from('observations')
      .insert({
        date,
        location,
        class_level: classLevel,
        number_of_horses: Number(numberOfHorses),
        result_list_url: resultListUrl || null,
        observer_id: user.id,
        observer_name: observerName,
        host_user_id: hostUserId,
        host_name: hostName,
        observation_year_id: yearId,
      })
      .select('id')
      .single();

    if (insertedObservation && hostUserId) {
      await supabase.from('notifications').insert({
        user_id: hostUserId,
        observation_id: insertedObservation.id,
        type: 'observation_approval',
        title: 'Ny bisitting venter på bekreftelse',
        message: `${observerName} har registrert en bisitting hos deg.`,
        link: '/approvals',
      });
    }

    if (insertError) {
      setError('Could not save observation');
      setLoading(false);
      return;
    }

    router.push('/observations');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <section className="card">
        <h1 className="text-2xl font-semibold mb-6">Registrer ny bisitting</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Dato</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Sted</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Klasse</label>
            <input
              type="text"
              value={classLevel}
              onChange={(e) => setClassLevel(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Antall ekvipasjer</label>
            <input
              type="number"
              min={1}
              value={numberOfHorses}
              onChange={(e) => setNumberOfHorses(Number(e.target.value))}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Link til resultatliste</label>
            <input
              type="url"
              value={resultListUrl}
              onChange={(e) => setResultListUrl(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="relative overflow-visible">
            <label className="block text-sm mb-1">Dommer du bisatt med</label>

            <input
              type="text"
              value={hostName}
              onChange={(e) => {
                setHostName(e.target.value);
                setHostUserId(null);
                setShowJudgeDropdown(true);
              }}
              onFocus={() => {
                if (hostName.length > 1) {
                  setShowJudgeDropdown(true);
                }
              }}
              required
              className="input"
              placeholder="Skriv navn på dommer"
            />

            {showJudgeDropdown && hostName.length > 1 && (
              <div className="absolute z-50 bg-white border rounded shadow w-full mt-1 max-h-48 overflow-y-auto">
                {judgeSuggestions
                  .filter((j) => j.full_name.toLowerCase().includes(hostName.toLowerCase()))
                  .map((j) => (
                    <button
                      key={j.user_id}
                      type="button"
                      onClick={() => {
                        setHostName(j.full_name);
                        setHostUserId(j.user_id);
                        setShowJudgeDropdown(false); // 👈 lukker dropdown
                      }}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                    >
                      {j.full_name}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded bg-black text-white"
            >
              {loading ? 'Lagrer..' : 'Lagre bisitting'}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 rounded border"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
