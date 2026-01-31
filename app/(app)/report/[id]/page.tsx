'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface ReportData {
  id: string;
  show_date: string | null;
  location: string | null;
  judge_1: string | null;
  judge_2: string | null;
  judge_3: string | null;
  created_at: string | null;
  payload: {
    classLevel?: string;
    riderName?: string;
    horseName?: string;
    totalPercent?: number;
    highestPercent?: number;
    lowestPercent?: number;
    deviation?: string;
    scores?: Record<string, number>;
    comments?: Record<string, string>;
    specialConditions?: string;
    specialComment?: string;
    otherCause?: string;
    reflection?: string;
  };
}

export default function ReportDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [judge1, setJudge1] = useState('');
  const [judge2, setJudge2] = useState('');
  const [judge3, setJudge3] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('judge_meeting_reports')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setReport(data);
      setJudge1(data.judge_1 || '');
      setJudge2(data.judge_2 || '');
      setJudge3(data.judge_3 || '');
      setLoading(false);
    };

    fetchReport();
  }, [id]);

  const handleUpdateJudges = async () => {
    if (!id || typeof id !== 'string') {
      setMessage('Ugyldig rapport-ID.');
      return;
    }

    setLoading(true);
    setMessage(null);

    // 🔹 Sjekk om dommerne finnes i profiles-tabellen
    async function findJudgeIdByName(name: string) {
      if (!name) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('full_name', name.trim());
      if (error || !data || data.length === 0) return null;
      return data[0].user_id;
    }

    const judge1_id = await findJudgeIdByName(judge1);
    const judge2_id = await findJudgeIdByName(judge2);
    const judge3_id = await findJudgeIdByName(judge3);

    const { error } = await supabase
      .from('judge_meeting_reports')
      .update({
        judge_1: judge1 || null,
        judge_2: judge2 || null,
        judge_3: judge3 || null,
        judge_1_id: judge1_id,
        judge_2_id: judge2_id,
        judge_3_id: judge3_id,
      })
      .eq('id', id.trim())
      .select();

    if (error) {
      console.error('Feil ved oppdatering:', error);
      setMessage('Kunne ikke oppdatere dommere.');
    } else {
      setMessage('Dommere ble oppdatert!');
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Laster rapport...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Fant ikke rapporten.
      </div>
    );
  }

  const { payload } = report;
  const REPORT_POINTS = [
    'Takt i skritt',
    'Takt i trav',
    'Takt i galopp',
    'Løsgjorthet',
    'Kontakt',
    'Schwung',
    'Retthet',
    'Samling',
    'Teknisk feil i øvelsene',
    'Allment inntrykk og harmoni',
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-deep-sea">Dommerrapport</h1>
          <button className="btn btn-secondary" onClick={() => router.push('/profile')}>
            ← Tilbake
          </button>
        </div>

        <p className="text-base text-black font-medium">
          {report.show_date
            ? new Date(report.show_date).toLocaleDateString('no-NO')
            : 'Ukjent dato'}{' '}
          – {report.location || 'Ukjent lokasjon'}
        </p>

        {/* Dommere */}
        <section>
          <h2 className="text-lg font-semibold text-deep-sea mb-2">Dommere</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input
              type="text"
              className="input"
              value={judge1}
              onChange={(e) => setJudge1(e.target.value)}
              placeholder="Dommer 1"
            />
            <input
              type="text"
              className="input"
              value={judge2}
              onChange={(e) => setJudge2(e.target.value)}
              placeholder="Dommer 2"
            />
            <input
              type="text"
              className="input"
              value={judge3}
              onChange={(e) => setJudge3(e.target.value)}
              placeholder="Dommer 3"
            />
          </div>
          <div className="flex justify-end mt-3">
            <button onClick={handleUpdateJudges} className="btn btn-primary" disabled={loading}>
              {loading ? 'Oppdaterer...' : 'Oppdater dommere'}
            </button>
          </div>
        </section>

        {/* Grunninfo */}
        <section>
          <h2 className="text-lg font-semibold text-deep-sea mb-2">Grunninformasjon</h2>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <p>
              <b>Klassenivå:</b> {payload.classLevel}
            </p>
            <p>
              <b>Rytter:</b> {payload.riderName}
            </p>
            <p>
              <b>Hest:</b> {payload.horseName}
            </p>
            <p>
              <b>Total %:</b> {payload.totalPercent ?? '—'}
            </p>
            <p>
              <b>Høyeste %:</b> {payload.highestPercent ?? '—'}
            </p>
            <p>
              <b>Laveste %:</b> {payload.lowestPercent ?? '—'}
            </p>
            <p>
              <b>Avvik %:</b> {payload.deviation ?? '—'}
            </p>
          </div>
        </section>

        {/* Punkter */}
        <section>
          <h2 className="text-lg font-semibold text-deep-sea mb-2">Vurderingspunkter</h2>
          {REPORT_POINTS.map((p) => (
            <div key={p} className="border-b border-[--color-border] py-2 mb-2">
              <p className="font-medium text-deep-sea">
                {p}:{' '}
                <span className="text-black">
                  {payload.scores?.[p] === 0 ? 'Ikke relevant' : (payload.scores?.[p] ?? '—')}
                </span>
              </p>
              {payload.comments?.[p] && (
                <p className="text-base text-black mt-2">{payload.comments[p]}</p>
              )}
            </div>
          ))}
        </section>

        {/* Refleksjon og forhold */}
        <section>
          <h2 className="text-lg font-semibold text-deep-sea mb-2">Refleksjon</h2>
          {payload.specialConditions && (
            <p>
              <b>Spesielle forhold:</b> {payload.specialConditions}{' '}
              {payload.specialComment && `– ${payload.specialComment}`}
            </p>
          )}
          {payload.otherCause && (
            <p>
              <b>Annen årsak:</b> {payload.otherCause}
            </p>
          )}
          {payload.reflection && (
            <p>
              <b>Refleksjon:</b> {payload.reflection}
            </p>
          )}
        </section>

        {message && <p className="text-green-600">{message}</p>}
      </div>
    </div>
  );
}
