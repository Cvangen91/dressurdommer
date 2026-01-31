'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Observation {
  id: string;
  date: string;
  location: string;
  class_level: string;
  number_of_horses: number;
  result_list_url: string | null;
  host_name: string;
  host_user_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_comment: string | null;
  observation_year_id: string;
}

export default function EditObservationPage() {
  const { observationId } = useParams<{ observationId: string }>();
  const router = useRouter();

  const [observation, setObservation] = useState<Observation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [numberOfHorses, setNumberOfHorses] = useState<number>(1);
  const [resultListUrl, setResultListUrl] = useState('');
  const [hostName, setHostName] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('observations')
        .select('*')
        .eq('id', observationId)
        .single();

      if (error || !data) {
        setObservation(null);
        setLoading(false);
        return;
      }

      setObservation(data);

      // Init form
      setDate(data.date);
      setLocation(data.location);
      setClassLevel(data.class_level);
      setNumberOfHorses(data.number_of_horses);
      setResultListUrl(data.result_list_url ?? '');
      setHostName(data.host_name);

      setLoading(false);
    };

    load();
  }, [observationId]);

  if (loading) return <p className="p-6">Laster…</p>;
  if (!observation) return <p className="p-6">Fant ikke bisitting.</p>;

  const isApproved = observation.status === 'approved';
  const isRejected = observation.status === 'rejected';
  const isEditable = !isApproved;

  // 💾 Lagre (pending eller rejected)
  const handleSave = async () => {
    if (!isEditable) return;

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const observerName = profileData?.full_name ?? 'En dommer';

    const { error } = await supabase
      .from('observations')
      .update({
        date,
        location,
        class_level: classLevel,
        number_of_horses: numberOfHorses,
        result_list_url: resultListUrl || null,
        host_name: hostName,
        status: 'pending',
        rejection_comment: null,
      })
      .eq('id', observation.id);

    if (error) {
      setSaving(false);
      return;
    }

    // 🔔 Kun varsle på nytt hvis den var avvist
    if (isRejected && observation.host_user_id) {
      await supabase.from('notifications').insert({
        user_id: observation.host_user_id,
        type: 'observation_approval',
        title: 'Bisitting sendt på nytt',
        message: `${observerName} har sendt inn bisittingen på nytt etter avvisning.`,
        link: '/approvals',
      });
    }

    setSaving(false);
    router.push(`/observations/${observation.observation_year_id}`);
  };

  // 🗑️ Slett bisitting (kun ikke-godkjent)
  const handleDelete = async () => {
    if (!isEditable) return;

    const confirmed = confirm('Er du sikker på at du vil slette denne bisittingen?');
    if (!confirmed) return;

    setDeleting(true);

    await supabase.from('observations').delete().eq('id', observation.id);

    setDeleting(false);
    router.push(`/observations/${observation.observation_year_id}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <section className="card">
        <h1 className="text-2xl font-semibold mb-4">Bisitting</h1>

        {isRejected && observation.rejection_comment && (
          <div className="border border-red-300 bg-red-50 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-red-700 mb-1">Avvist av dommer</p>
            <p className="text-sm text-red-800">{observation.rejection_comment}</p>
          </div>
        )}

        <div className="space-y-4 text-sm">
          <div>
            <label className="label">Dato</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={!isEditable}
              className={`input ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className="label">Sted</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={!isEditable}
              className={`input ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className="label">Klasse</label>
            <input
              value={classLevel}
              onChange={(e) => setClassLevel(e.target.value)}
              disabled={!isEditable}
              className={`input ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className="label">Antall ekvipasjer</label>
            <input
              type="number"
              min={1}
              value={numberOfHorses}
              onChange={(e) => setNumberOfHorses(Number(e.target.value))}
              disabled={!isEditable}
              className={`input ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className="label">Dommer</label>
            <input
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              disabled={!isEditable}
              className={`input ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className="label">Resultatliste (valgfritt)</label>
            <input
              value={resultListUrl}
              onChange={(e) => setResultListUrl(e.target.value)}
              disabled={!isEditable}
              className={`input ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 items-center">
          {!isApproved && (
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              {saving ? 'Lagrer…' : isRejected ? 'Lagre og send på nytt' : 'Lagre endringer'}
            </button>
          )}

          {!isApproved && (
            <button onClick={handleDelete} disabled={deleting} className="btn btn-danger">
              {deleting ? 'Sletter…' : 'Slett bisitting'}
            </button>
          )}

          {isApproved && (
            <p className="text-sm text-muted">
              Denne bisittingen er godkjent og kan ikke redigeres.
            </p>
          )}

          <button onClick={() => router.back()} className="btn btn-secondary">
            Tilbake
          </button>
        </div>
      </section>
    </div>
  );
}
