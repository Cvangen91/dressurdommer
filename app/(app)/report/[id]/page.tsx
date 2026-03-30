'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type JudgePosition = 'C' | 'M' | 'H' | 'B' | 'E';
type JudgeEntry = {
  position: JudgePosition;
  name: string;
  user_id?: string | null;
  percent?: number | null;
  resultNumber?: number | null;
};

type MappedJudges = {
  judgeC: string;
  judgeM: string;
  judgeH: string;
  judgeB: string;
  judgeE: string;
  pctC?: number;
  pctM?: number;
  pctH?: number;
  pctB?: number;
  pctE?: number;
};

interface ReportData {
  id: string;
  user_id: string;
  status: 'draft' | 'submitted' | null;
  show_date: string | null;
  location: string | null;
  judges: JudgeEntry[] | null;
  judge_user_ids: string[] | null;
  created_at: string | null;
  payload: {
    draft?: boolean;
    classLevel?: string;
    riderName?: string;
    horseName?: string;
    numStartersClass?: number | null;
    classPlacementTotal?: number | null;
    totalPercent?: number;
    highestPercent?: number;
    lowestPercent?: number;
    deviation?: string;
    judgePercents?: Partial<Record<JudgePosition, number>>;
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [judge1, setJudge1] = useState('');
  const [judge2, setJudge2] = useState('');
  const [judge3, setJudge3] = useState('');
  const [judge4, setJudge4] = useState('');
  const [judge5, setJudge5] = useState('');
  const [judge1Percent, setJudge1Percent] = useState<number | ''>('');
  const [judge2Percent, setJudge2Percent] = useState<number | ''>('');
  const [judge3Percent, setJudge3Percent] = useState<number | ''>('');
  const [judge4Percent, setJudge4Percent] = useState<number | ''>('');
  const [judge5Percent, setJudge5Percent] = useState<number | ''>('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!id) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

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

      const mappedJudges = Array.isArray(data.judges)
        ? (data.judges as JudgeEntry[]).reduce<MappedJudges>(
            (acc, j) => {
              if (j?.position === 'C') acc.judgeC = j.name || '';
              if (j?.position === 'M') acc.judgeM = j.name || '';
              if (j?.position === 'H') acc.judgeH = j.name || '';
              if (j?.position === 'B') acc.judgeB = j.name || '';
              if (j?.position === 'E') acc.judgeE = j.name || '';
              if (j?.position === 'C' && typeof j.percent === 'number') acc.pctC = j.percent;
              if (j?.position === 'M' && typeof j.percent === 'number') acc.pctM = j.percent;
              if (j?.position === 'H' && typeof j.percent === 'number') acc.pctH = j.percent;
              if (j?.position === 'B' && typeof j.percent === 'number') acc.pctB = j.percent;
              if (j?.position === 'E' && typeof j.percent === 'number') acc.pctE = j.percent;
              return acc;
            },
            {
              judgeC: '',
              judgeM: '',
              judgeH: '',
              judgeB: '',
              judgeE: '',
              pctC: undefined,
              pctM: undefined,
              pctH: undefined,
              pctB: undefined,
              pctE: undefined,
            }
          )
        : null;

      setJudge1(mappedJudges?.judgeC || '');
      setJudge2(mappedJudges?.judgeM || '');
      setJudge3(mappedJudges?.judgeH || '');
      setJudge4(mappedJudges?.judgeB || '');
      setJudge5(mappedJudges?.judgeE || '');
      setJudge1Percent(mappedJudges?.pctC ?? data.payload?.judgePercents?.C ?? '');
      setJudge2Percent(mappedJudges?.pctM ?? data.payload?.judgePercents?.M ?? '');
      setJudge3Percent(mappedJudges?.pctH ?? data.payload?.judgePercents?.H ?? '');
      setJudge4Percent(mappedJudges?.pctB ?? data.payload?.judgePercents?.B ?? '');
      setJudge5Percent(mappedJudges?.pctE ?? data.payload?.judgePercents?.E ?? '');
      setLoading(false);
    };

    fetchReport();
  }, [id]);

  const handleUpdateJudges = async () => {
    if (!id || typeof id !== 'string') {
      setMessage('Ugyldig rapport-ID.');
      return;
    }

    if (!report || !currentUserId || report.user_id !== currentUserId) {
      setMessage('Kun dommer C kan redigere dommere i denne rapporten.');
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

    const isSubmitted =
      report.status === 'submitted' ||
      (report.payload && typeof report.payload.draft === 'boolean' && !report.payload.draft);

    const existingC = Array.isArray(report.judges)
      ? report.judges.find((j) => j.position === 'C')
      : null;

    const cName = isSubmitted ? (existingC?.name ?? '').trim() : judge1.trim();
    const cId = isSubmitted ? (existingC?.user_id ?? null) : await findJudgeIdByName(judge1);

    const [judge2_id, judge3_id, judge4_id, judge5_id] = await Promise.all([
      findJudgeIdByName(judge2),
      findJudgeIdByName(judge3),
      findJudgeIdByName(judge4),
      findJudgeIdByName(judge5),
    ]);

    const cPercent = isSubmitted
      ? typeof existingC?.percent === 'number'
        ? existingC.percent
        : (report.payload?.judgePercents?.C ?? null)
      : typeof judge1Percent === 'number'
        ? judge1Percent
        : null;
    const mPercent = typeof judge2Percent === 'number' ? judge2Percent : null;
    const hPercent = typeof judge3Percent === 'number' ? judge3Percent : null;
    const bPercent = typeof judge4Percent === 'number' ? judge4Percent : null;
    const ePercent = typeof judge5Percent === 'number' ? judge5Percent : null;

    const judgesPayload: JudgeEntry[] = [
      { position: 'C' as JudgePosition, name: cName, user_id: cId, percent: cPercent },
      {
        position: 'M' as JudgePosition,
        name: judge2.trim(),
        user_id: judge2_id,
        percent: mPercent,
      },
      {
        position: 'H' as JudgePosition,
        name: judge3.trim(),
        user_id: judge3_id,
        percent: hPercent,
      },
      {
        position: 'B' as JudgePosition,
        name: judge4.trim(),
        user_id: judge4_id,
        percent: bPercent,
      },
      {
        position: 'E' as JudgePosition,
        name: judge5.trim(),
        user_id: judge5_id,
        percent: ePercent,
      },
    ].filter((j) => j.name || j.user_id);

    const judgeUserIds = judgesPayload
      .map((j) => j.user_id)
      .filter((uid): uid is string => Boolean(uid));

    const judgePercents: Partial<Record<JudgePosition, number>> = {};
    if (typeof cPercent === 'number') judgePercents.C = cPercent;
    if (typeof mPercent === 'number') judgePercents.M = mPercent;
    if (typeof hPercent === 'number') judgePercents.H = hPercent;
    if (typeof bPercent === 'number') judgePercents.B = bPercent;
    if (typeof ePercent === 'number') judgePercents.E = ePercent;

    const percentValues = Object.values(judgePercents);
    const highest = percentValues.length ? Math.max(...percentValues) : null;
    const lowest = percentValues.length ? Math.min(...percentValues) : null;
    const average =
      percentValues.length > 0
        ? percentValues.reduce((sum, value) => sum + value, 0) / percentValues.length
        : null;
    const deviationValue =
      highest !== null && lowest !== null ? (highest - lowest).toFixed(3) : null;

    const nextPayload = {
      ...(report.payload || {}),
      judgePercents,
      totalPercent: average,
      highestPercent: highest,
      lowestPercent: lowest,
      deviation: deviationValue,
    };

    const { error } = await supabase
      .from('judge_meeting_reports')
      .update({
        judges: judgesPayload,
        judge_user_ids: judgeUserIds,
        judge_1: cName || null,
        judge_2: judge2 || null,
        judge_3: judge3 || null,
        judge_1_id: cId,
        judge_2_id: judge2_id,
        judge_3_id: judge3_id,
        payload: nextPayload,
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
  const formatPercent = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return '—';
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(3) : '—';
  };
  const canEditJudges = Boolean(currentUserId && report.user_id === currentUserId);
  const isSubmitted =
    report.status === 'submitted' ||
    (report.payload && typeof report.payload.draft === 'boolean' && !report.payload.draft);
  const canEditJudgeC = canEditJudges && !isSubmitted;
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
          <h1 className="text-2xl font-semibold text-deep-sea">Dommermøterapport</h1>
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
          <div className="grid md:grid-cols-5 gap-3">
            <div className="space-y-2">
              <input
                type="text"
                className="input"
                value={judge1}
                onChange={(e) => setJudge1(e.target.value)}
                placeholder="Dommer C"
                disabled={!canEditJudgeC}
              />
              <input
                type="number"
                step="0.001"
                className="input"
                value={judge1Percent}
                onChange={(e) =>
                  setJudge1Percent(
                    Number.isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber
                  )
                }
                placeholder="%"
                disabled={!canEditJudgeC || isSubmitted}
              />
            </div>
            <div className="space-y-2">
              <input
                type="text"
                className="input"
                value={judge2}
                onChange={(e) => setJudge2(e.target.value)}
                placeholder="Dommer M"
                disabled={!canEditJudges}
              />
              <input
                type="number"
                step="0.001"
                className="input"
                value={judge2Percent}
                onChange={(e) =>
                  setJudge2Percent(
                    Number.isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber
                  )
                }
                placeholder="%"
                disabled={!canEditJudges || isSubmitted}
              />
            </div>
            <div className="space-y-2">
              <input
                type="text"
                className="input"
                value={judge3}
                onChange={(e) => setJudge3(e.target.value)}
                placeholder="Dommer H"
                disabled={!canEditJudges}
              />
              <input
                type="number"
                step="0.001"
                className="input"
                value={judge3Percent}
                onChange={(e) =>
                  setJudge3Percent(
                    Number.isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber
                  )
                }
                placeholder="%"
                disabled={!canEditJudges || isSubmitted}
              />
            </div>
            <div className="space-y-2">
              <input
                type="text"
                className="input"
                value={judge4}
                onChange={(e) => setJudge4(e.target.value)}
                placeholder="Dommer B"
                disabled={!canEditJudges}
              />
              <input
                type="number"
                step="0.001"
                className="input"
                value={judge4Percent}
                onChange={(e) =>
                  setJudge4Percent(
                    Number.isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber
                  )
                }
                placeholder="%"
                disabled={!canEditJudges || isSubmitted}
              />
            </div>
            <div className="space-y-2">
              <input
                type="text"
                className="input"
                value={judge5}
                onChange={(e) => setJudge5(e.target.value)}
                placeholder="Dommer E"
                disabled={!canEditJudges}
              />
              <input
                type="number"
                step="0.001"
                className="input"
                value={judge5Percent}
                onChange={(e) =>
                  setJudge5Percent(
                    Number.isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber
                  )
                }
                placeholder="%"
                disabled={!canEditJudges || isSubmitted}
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={handleUpdateJudges}
              className="btn btn-primary"
              disabled={loading || !canEditJudges}
              title={!canEditJudges ? 'Kun dommer C kan redigere.' : undefined}
            >
              {loading ? 'Oppdaterer...' : isSubmitted ? 'Oppdater meddommere' : 'Oppdater dommere'}
            </button>
          </div>
          {!canEditJudges && (
            <p className="text-xs text-muted mt-2">
              Kun dommer C kan redigere dommere i rapporten.
            </p>
          )}
          {canEditJudges && isSubmitted && (
            <p className="text-xs text-muted mt-2">
              Rapporten er sendt inn. Dommer C er låst, og du kan kun oppdatere navn på meddommere.
            </p>
          )}
        </section>

        {/* Grunninfo */}
        <section>
          <h2 className="text-lg font-semibold text-deep-sea mb-2">Grunninformasjon</h2>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <p>
              <b>Klasse:</b> {payload.classLevel}
            </p>
            <p>
              <b>Antall i klassen:</b> {payload.numStartersClass ?? '—'}
            </p>
            <p>
              <b>Plassering i klassen:</b> {payload.classPlacementTotal ?? '—'}
            </p>
            <p>
              <b>Rytter:</b> {payload.riderName}
            </p>
            <p>
              <b>Hest:</b> {payload.horseName}
            </p>
            <p>
              <b>Høyeste %:</b> {formatPercent(payload.highestPercent)}
            </p>
            <p>
              <b>Laveste %:</b> {formatPercent(payload.lowestPercent)}
            </p>
            <p>
              <b>Total %:</b> {formatPercent(payload.totalPercent)}
            </p>
            <p>
              <b>Avvik %:</b> {formatPercent(payload.deviation)}
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
