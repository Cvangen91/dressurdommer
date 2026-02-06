'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';

type JudgeSuggestion = { user_id: string; full_name: string };
type JudgeMeetingReportStatus = 'draft' | 'submitted';

type ReportRow = {
  id: string;
  user_id: string;
  show_date: string | null;
  location: string | null;
  judge_1: string | null;
  judge_2: string | null;
  judge_3: string | null;
  judge_1_id: string | null;
  judge_2_id: string | null;
  judge_3_id: string | null;
  status: JudgeMeetingReportStatus | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string | null;
  payload: any;
};

export default function ReportEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Navigasjon
  const nextStep = () => setStep((s) => Math.min(5, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const [reportStatus, setReportStatus] = useState<JudgeMeetingReportStatus>('draft');

  // --- STEG 1: Grunninfo ---
  const [showDate, setShowDate] = useState('');
  const [location, setLocation] = useState('');
  const [judge1, setJudge1] = useState('');
  const [judge2, setJudge2] = useState('');
  const [judge3, setJudge3] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [riderName, setRiderName] = useState('');
  const [horseName, setHorseName] = useState('');
  const [totalPercent, setTotalPercent] = useState<number | ''>('');
  const [highestPercent, setHighestPercent] = useState<number | ''>('');
  const [lowestPercent, setLowestPercent] = useState<number | ''>('');

  const deviation =
    highestPercent !== '' && lowestPercent !== ''
      ? (Number(highestPercent) - Number(lowestPercent)).toFixed(2)
      : '';

  // --- Dropdown: dommer-søk ---
  const [judgeSuggestions, setJudgeSuggestions] = useState<JudgeSuggestion[]>([]);
  const [activeJudgeField, setActiveJudgeField] = useState<1 | 2 | 3 | null>(null);
  const [showJudgeDropdown, setShowJudgeDropdown] = useState(false);
  const judgeDropdownRef = useRef<HTMLDivElement | null>(null);

  // --- STEG 2: Punkter ---
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

  const [scores, setScores] = useState<Record<string, number | ''>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [showHelp, setShowHelp] = useState(false);

  // --- STEG 3: Refleksjon ---
  const [specialConditions, setSpecialConditions] = useState('');
  const [specialComment, setSpecialComment] = useState('');
  const [otherCause, setOtherCause] = useState('');
  const [reflection, setReflection] = useState('');

  // --- STEG 4: Bilder ---
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingImagePaths, setExistingImagePaths] = useState<string[]>([]);

  const isLocked = reportStatus !== 'draft';

  // Hent dommere til autocomplete
  useEffect(() => {
    const loadJudges = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .not('full_name', 'is', null);

      if (data) setJudgeSuggestions(data as JudgeSuggestion[]);
    };

    loadJudges();
  }, []);

  // Klikk utenfor-lukking dropdown
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!showJudgeDropdown) return;
      const el = judgeDropdownRef.current;
      if (!el) return;

      if (e.target instanceof Node && !el.contains(e.target)) {
        setShowJudgeDropdown(false);
        setActiveJudgeField(null);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [showJudgeDropdown]);

  const activeJudgeValue = useMemo(() => {
    if (activeJudgeField === 1) return judge1;
    if (activeJudgeField === 2) return judge2;
    if (activeJudgeField === 3) return judge3;
    return '';
  }, [activeJudgeField, judge1, judge2, judge3]);

  const filteredJudgeSuggestions = useMemo(() => {
    const q = activeJudgeValue.trim().toLowerCase();
    if (q.length < 2) return [];
    return judgeSuggestions.filter((j) => j.full_name.toLowerCase().includes(q)).slice(0, 20);
  }, [activeJudgeValue, judgeSuggestions]);

  const setJudgeValue = (field: 1 | 2 | 3, value: string) => {
    if (field === 1) setJudge1(value);
    if (field === 2) setJudge2(value);
    if (field === 3) setJudge3(value);
  };

  // Fetch report
  useEffect(() => {
    const fetchReport = async () => {
      setPageLoading(true);
      setMessage(null);

      if (!id) {
        setMessage('Ugyldig rapport-ID.');
        setPageLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('judge_meeting_reports')
        .select(
          'id, user_id, show_date, location, judge_1, judge_2, judge_3, judge_1_id, judge_2_id, judge_3_id, status, submitted_at, created_at, updated_at, payload'
        )
        .eq('id', id)
        .single();

      if (error || !data) {
        setMessage('Fant ikke rapporten.');
        setPageLoading(false);
        return;
      }

      // Sikkerhet: kun eier kan redigere her
      if (data.user_id !== user.id) {
        setMessage('Du har ikke tilgang til å redigere denne rapporten.');
        setPageLoading(false);
        return;
      }

      const payload = (data as ReportRow).payload || {};
      const status: JudgeMeetingReportStatus =
        (data as ReportRow).status === 'submitted' ? 'submitted' : 'draft';

      setReportStatus(status);

      setShowDate((data as ReportRow).show_date ?? '');
      setLocation((data as ReportRow).location ?? '');
      setJudge1((data as ReportRow).judge_1 ?? '');
      setJudge2((data as ReportRow).judge_2 ?? '');
      setJudge3((data as ReportRow).judge_3 ?? '');

      setClassLevel(payload.classLevel ?? '');
      setRiderName(payload.riderName ?? '');
      setHorseName(payload.horseName ?? '');

      setTotalPercent(payload.totalPercent ?? '');
      setHighestPercent(payload.highestPercent ?? '');
      setLowestPercent(payload.lowestPercent ?? '');

      setScores(payload.scores ?? {});
      setComments(payload.comments ?? {});
      setSpecialConditions(payload.specialConditions ?? '');
      setSpecialComment(payload.specialComment ?? '');
      setOtherCause(payload.otherCause ?? '');
      setReflection(payload.reflection ?? '');

      const paths = Array.isArray(payload.imagePaths) ? payload.imagePaths : [];
      setExistingImagePaths(paths);

      setPageLoading(false);
    };

    fetchReport();
  }, [id, router]);

  // Finn dommer-id (returnerer null om navnet ikke finnes)
  async function findJudgeIdByName(name: string) {
    const clean = name.trim();
    if (!clean) return null;

    const { data } = await supabase.from('profiles').select('user_id').ilike('full_name', clean);
    return (data as any)?.[0]?.user_id || null;
  }

  // Last opp bilder til Supabase
  async function uploadImages(userId: string) {
    if (!selectedFiles.length) return [];

    const paths: string[] = [];
    for (const file of selectedFiles) {
      const safeName = file.name.replace(/\s+/g, '_');
      const fileName = `${userId}/${Date.now()}-${safeName}`;

      const { error } = await supabase.storage.from('reports').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (!error) paths.push(fileName);
    }

    return paths;
  }

  const buildPayload = (extra?: Record<string, any>) => ({
    classLevel,
    riderName,
    horseName,
    totalPercent: totalPercent === '' ? null : Number(totalPercent),
    highestPercent: highestPercent === '' ? null : Number(highestPercent),
    lowestPercent: lowestPercent === '' ? null : Number(lowestPercent),
    deviation: deviation === '' ? null : deviation,
    scores,
    comments,
    specialConditions,
    specialComment,
    otherCause,
    reflection,
    imagePaths: existingImagePaths,
    ...extra,
  });

  // Lagre (UPDATE)
  const handleSaveDraft = async () => {
    if (loading || isLocked) return;

    setLoading(true);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const [judge1Id, judge2Id, judge3Id] = await Promise.all([
        findJudgeIdByName(judge1),
        findJudgeIdByName(judge2),
        findJudgeIdByName(judge3),
      ]);

      const { error } = await supabase
        .from('judge_meeting_reports')
        .update({
          show_date: showDate || null,
          location: location || null,
          judge_1: judge1 || null,
          judge_2: judge2 || null,
          judge_3: judge3 || null,
          judge_1_id: judge1Id,
          judge_2_id: judge2Id,
          judge_3_id: judge3Id,
          status: 'draft',
          submitted_at: null,
          payload: buildPayload(),
        })
        .eq('id', id);

      if (error) {
        setMessage('Kunne ikke lagre utkast. Prøv igjen.');
        return;
      }

      setMessage('Utkast lagret!');
      router.push('/profile');
    } catch {
      setMessage('Noe gikk galt ved lagring.');
    } finally {
      setLoading(false);
    }
  };

  // Send inn (UPDATE -> submitted)
  const handleSubmit = async () => {
    if (loading || isLocked) return;

    setLoading(true);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const [judge1Id, judge2Id, judge3Id] = await Promise.all([
        findJudgeIdByName(judge1),
        findJudgeIdByName(judge2),
        findJudgeIdByName(judge3),
      ]);

      const newImagePaths = await uploadImages(user.id);
      const mergedImagePaths = [...existingImagePaths, ...newImagePaths];
      setExistingImagePaths(mergedImagePaths);

      const { error: submitError } = await supabase
        .from('judge_meeting_reports')
        .update({
          show_date: showDate || null,
          location: location || null,
          judge_1: judge1 || null,
          judge_2: judge2 || null,
          judge_3: judge3 || null,
          judge_1_id: judge1Id,
          judge_2_id: judge2Id,
          judge_3_id: judge3Id,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          payload: buildPayload({ imagePaths: mergedImagePaths }),
        })
        .eq('id', id);

      if (submitError) {
        setMessage('Kunne ikke sende inn rapport. Prøv igjen.');
        return;
      }

      setReportStatus('submitted');

      const { error: fnError } = await supabase.functions.invoke('send-judge-meeting-report', {
        body: {
          reportId: id,
          toEmail: 'post@dressurdommer.no',
        },
      });

      if (fnError) {
        setMessage('Rapport sendt inn, men e-post kunne ikke sendes. Prøv igjen senere.');
        router.push('/profile');
        return;
      }

      setMessage('Rapport sendt inn! E-post er sendt.');
      setTimeout(() => router.push('/profile'), 800);
    } catch {
      setMessage('Noe gikk galt ved innsending.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, label: 'Grunninfo' },
    { id: 2, label: 'Rapport' },
    { id: 3, label: 'Refleksjon' },
    { id: 4, label: 'Protokoller' },
    { id: 5, label: 'Oppsummering' },
  ];

  const filteredPoints = REPORT_POINTS.filter(
    (p) => scores[p] !== 0 && scores[p] !== '' && scores[p] !== undefined
  );

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    setPreviewUrls(fileArray.map((f) => URL.createObjectURL(f)));
  };

  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Laster rapport...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-deep-sea">
            {isLocked ? 'Dommermøterapport (sendt inn)' : 'Rediger utkast'}
          </h1>
          <button className="btn btn-secondary" onClick={() => router.push('/profile')}>
            ← Tilbake
          </button>
        </div>

        {message && (
          <div
            className={`rounded-md px-4 py-3 text-sm ${
              message.toLowerCase().includes('ikke') || message.toLowerCase().includes('feil')
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}
          >
            {message}
          </div>
        )}

        {/* Stegindikator */}
        <div className="relative mb-10">
          <div className="absolute top-4 left-0 w-full h-0.5 bg-ocean-fog z-0" />
          <div
            className="absolute top-4 left-0 h-0.5 bg-blue-sapphire z-10 transition-all duration-500"
            style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
          />
          <div className="flex justify-between relative z-20">
            {steps.map((s) => (
              <div key={s.id} className="flex flex-col items-center w-1/5">
                <div
                  className={`w-9 h-9 flex items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300
                    ${
                      step === s.id
                        ? 'bg-deep-sea border-deep-sea text-white'
                        : step > s.id
                          ? 'border-blue-sapphire text-blue-sapphire bg-white'
                          : 'border-ocean-fog text-blue-sapphire bg-white'
                    }`}
                >
                  {s.id}
                </div>
                <span
                  className={`mt-2 text-xs font-medium hidden sm:block ${
                    step === s.id
                      ? 'text-deep-sea'
                      : step > s.id
                        ? 'text-blue-sapphire'
                        : 'text-ocean-fog'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* --- STEG 1 --- */}
        {step === 1 && (
          <>
            <h2 className="text-xl font-semibold text-deep-sea mb-4">Steg 1: Grunninformasjon</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Dato</label>
                <input
                  type="date"
                  value={showDate}
                  onChange={(e) => setShowDate(e.target.value)}
                  className="input"
                  disabled={isLocked}
                />
              </div>
              <div>
                <label className="label">Lokasjon</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input"
                  disabled={isLocked}
                />
              </div>
            </div>

            <div ref={judgeDropdownRef} className="grid md:grid-cols-3 gap-4">
              {[
                { n: 1 as const, label: 'Dommer 1', value: judge1 },
                { n: 2 as const, label: 'Dommer 2', value: judge2 },
                { n: 3 as const, label: 'Dommer 3', value: judge3 },
              ].map((f) => (
                <div key={f.n} className="relative overflow-visible">
                  <label className="label">{f.label}</label>

                  <input
                    type="text"
                    value={f.value}
                    onChange={(e) => {
                      if (isLocked) return;
                      setJudgeValue(f.n, e.target.value);
                      setActiveJudgeField(f.n);
                      setShowJudgeDropdown(true);
                    }}
                    onFocus={() => {
                      if (isLocked) return;
                      setActiveJudgeField(f.n);
                      if (f.value.trim().length >= 2) setShowJudgeDropdown(true);
                    }}
                    className="input"
                    placeholder="Skriv navn"
                    autoComplete="off"
                    disabled={isLocked}
                  />

                  {!isLocked &&
                    showJudgeDropdown &&
                    activeJudgeField === f.n &&
                    filteredJudgeSuggestions.length > 0 && (
                      <div className="absolute z-50 bg-white border rounded shadow w-full mt-1 max-h-48 overflow-y-auto">
                        {filteredJudgeSuggestions.map((j) => (
                          <button
                            key={j.user_id}
                            type="button"
                            onClick={() => {
                              setJudgeValue(f.n, j.full_name);
                              setShowJudgeDropdown(false);
                              setActiveJudgeField(null);
                            }}
                            className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                          >
                            {j.full_name}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Klassenivå / program</label>
                <input
                  type="text"
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  className="input"
                  disabled={isLocked}
                />
              </div>
              <div>
                <label className="label">Rytter</label>
                <input
                  type="text"
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  className="input"
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Hest</label>
                <input
                  type="text"
                  value={horseName}
                  onChange={(e) => setHorseName(e.target.value)}
                  className="input"
                  disabled={isLocked}
                />
              </div>
              <div>
                <label className="label">Total %</label>
                <input
                  type="number"
                  step="0.01"
                  value={totalPercent}
                  onChange={(e) =>
                    setTotalPercent(
                      Number.isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber
                    )
                  }
                  className="input"
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="label">Høyeste %</label>
                <input
                  type="number"
                  step="0.01"
                  value={highestPercent}
                  onChange={(e) =>
                    setHighestPercent(
                      Number.isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber
                    )
                  }
                  className="input"
                  disabled={isLocked}
                />
              </div>
              <div>
                <label className="label">Laveste %</label>
                <input
                  type="number"
                  step="0.01"
                  value={lowestPercent}
                  onChange={(e) =>
                    setLowestPercent(
                      Number.isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber
                    )
                  }
                  className="input"
                  disabled={isLocked}
                />
              </div>
              <div>
                <label className="label">Avvik % (auto)</label>
                <input value={deviation} readOnly className="input bg-warm-sand-light" />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                className="btn btn-primary"
                onClick={nextStep}
                disabled={loading}
              >
                Neste →
              </button>
            </div>
          </>
        )}

        {/* --- STEG 2 --- */}
        {step === 2 && (
          <>
            <h2 className="text-xl font-semibold text-deep-sea mb-4">Steg 2: Dommerrapport</h2>

            <button
              type="button"
              className="text-deep-sea underline mb-3"
              onClick={() => setShowHelp(!showHelp)}
            >
              {showHelp ? 'Skjul veiledning' : 'Slik fyller du ut rapporten'}
            </button>

            {showHelp && (
              <div className="bg-warm-sand-light p-4 rounded-md text-sm mb-4">
                <p>
                  Dommermøterapporter fylles ut når to dommere har et prosentavvik på mer enn 7%
                  (10% i kür). Hensikten med Dommermøterapporter er å oppklare årsaken ved store
                  forskjeller mellom dommerne.
                </p>
              </div>
            )}

            {REPORT_POINTS.map((p) => (
              <div key={p} className="border-b border-[--color-border] pb-4 mb-4">
                <label className="label font-medium text-deep-sea">{p}</label>
                <div className="flex gap-3 mt-1 mb-3 flex-wrap">
                  {[0, 1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        if (isLocked) return;
                        setScores((prev) => ({ ...prev, [p]: v }));
                      }}
                      className={`px-3 h-10 rounded-md border text-sm font-semibold transition-all ${
                        scores[p] === v
                          ? 'bg-deep-sea text-white border-deep-sea'
                          : 'bg-white border-ocean-fog text-blue-sapphire hover:border-deep-sea'
                      } ${isLocked ? 'opacity-60 pointer-events-none' : ''}`}
                      title={v === 0 ? 'Ikke relevant' : String(v)}
                    >
                      {v === 0 ? 'Ikke relevant' : v}
                    </button>
                  ))}
                </div>

                {scores[p] !== undefined && scores[p] !== 0 && scores[p] !== '' && (
                  <textarea
                    value={comments[p] ?? ''}
                    onChange={(e) => {
                      if (isLocked) return;
                      setComments((prev) => ({ ...prev, [p]: e.target.value }));
                    }}
                    className="input"
                    placeholder="Kommentar (valgfritt)"
                    disabled={isLocked}
                  />
                )}
              </div>
            ))}

            <div className="flex justify-between mt-6">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={prevStep}
                disabled={loading}
              >
                ← Forrige
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={nextStep}
                disabled={loading}
              >
                Neste →
              </button>
            </div>
          </>
        )}

        {/* --- STEG 3 --- */}
        {step === 3 && (
          <>
            <h2 className="text-xl font-semibold text-deep-sea mb-4">Steg 3: Refleksjon</h2>

            <label className="label mb-2">
              Spesielle forhold som gjorde det vanskelig å dømme klassen?
            </label>
            <div className="flex gap-3 mb-3">
              {['Ja', 'Nei'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    if (isLocked) return;
                    setSpecialConditions(val);
                  }}
                  className={`px-5 py-2 rounded-md border font-medium transition-all ${
                    specialConditions === val
                      ? 'bg-deep-sea border-deep-sea text-white'
                      : 'bg-white border-ocean-fog text-blue-sapphire hover:border-deep-sea'
                  } ${isLocked ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  {val}
                </button>
              ))}
            </div>

            {specialConditions === 'Ja' && (
              <textarea
                value={specialComment}
                onChange={(e) => {
                  if (isLocked) return;
                  setSpecialComment(e.target.value);
                }}
                className="input"
                placeholder="Beskriv forholdene"
                disabled={isLocked}
              />
            )}

            <div className="mt-4">
              <label className="label">Annen årsak til avvik</label>
              <input
                value={otherCause}
                onChange={(e) => {
                  if (isLocked) return;
                  setOtherCause(e.target.value);
                }}
                className="input"
                placeholder="Annet relevant å bemerke"
                disabled={isLocked}
              />
            </div>

            <div className="mt-4">
              <label className="label">Refleksjon fra dommermøte</label>
              <textarea
                value={reflection}
                onChange={(e) => {
                  if (isLocked) return;
                  setReflection(e.target.value);
                }}
                className="input"
                placeholder="Skriv refleksjoner her"
                disabled={isLocked}
              />
            </div>

            <div className="flex justify-between mt-6">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={prevStep}
                disabled={loading}
              >
                ← Forrige
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={nextStep}
                disabled={loading}
              >
                Neste →
              </button>
            </div>
          </>
        )}

        {/* --- STEG 4 --- */}
        {step === 4 && (
          <>
            <h2 className="text-xl font-semibold text-deep-sea mb-4">
              Steg 4: Last opp protokollbilder
            </h2>
            <p className="text-muted mb-3 text-sm">
              Her kan du laste opp bilder av protokollene fra stevnet. Du kan laste opp flere filer
              samtidig.
            </p>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="input"
              disabled={isLocked}
            />

            {previewUrls.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                {previewUrls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Forhåndsvisning ${idx + 1}`}
                    className="rounded-md shadow-md w-full"
                  />
                ))}
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={prevStep}
                disabled={loading}
              >
                ← Forrige
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={nextStep}
                disabled={loading}
              >
                Neste →
              </button>
            </div>
          </>
        )}

        {/* --- STEG 5 --- */}
        {step === 5 && (
          <>
            <h2 className="text-xl font-semibold text-deep-sea mb-4">Steg 5: Oppsummering</h2>
            <p className="text-muted mb-4">Se gjennom alt du har fylt ut før du sender inn.</p>

            <div className="space-y-2 text-sm">
              <p>
                <b>Dato:</b> {showDate}
              </p>
              <p>
                <b>Lokasjon:</b> {location}
              </p>
              <p>
                <b>Dommere:</b> {judge1}, {judge2}, {judge3}
              </p>
              <p>
                <b>Klasse:</b> {classLevel}
              </p>
              <p>
                <b>Rytter:</b> {riderName}
              </p>
              <p>
                <b>Hest:</b> {horseName}
              </p>
              <p>
                <b>Total %:</b> {totalPercent}
              </p>
              <p>
                <b>Avvik %:</b> {deviation}
              </p>
            </div>

            <h3 className="text-deep-sea font-semibold mt-4">Vurderingspunkter</h3>
            {filteredPoints.map((p) => (
              <div key={p} className="mb-2">
                <b>{p}:</b> {scores[p] === 0 ? 'Ikke relevant' : scores[p]}
                {comments[p] && <p className="text-sm text-muted mt-1">{comments[p]}</p>}
              </div>
            ))}

            {existingImagePaths.length > 0 && (
              <>
                <h3 className="text-deep-sea font-semibold mt-4">Protokollbilder (lagret)</h3>
                <ul className="text-xs text-muted list-disc pl-5 space-y-1">
                  {existingImagePaths.map((p) => (
                    <li key={p} className="break-all">
                      {p}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-6">
              <button
                type="button"
                className="btn btn-secondary w-full sm:w-auto"
                onClick={() => setStep(4)}
                disabled={loading}
              >
                ← Forrige
              </button>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  className="btn btn-secondary w-full sm:w-auto"
                  onClick={handleSaveDraft}
                  disabled={loading || isLocked}
                >
                  {loading ? 'Lagrer...' : 'Lagre utkast'}
                </button>

                <button
                  type="button"
                  className="btn btn-primary w-full sm:w-auto"
                  onClick={handleSubmit}
                  disabled={loading || isLocked}
                >
                  {loading ? 'Sender...' : 'Send inn rapport'}
                </button>
              </div>
            </div>

            {isLocked && (
              <p className="text-xs text-muted mt-3">
                Denne rapporten er sendt inn og kan ikke redigeres.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
