'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ReportNewPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  // --- Dropdown: dommer-søk (kan fortsatt skrive fritekst) ---
  const [judgeSuggestions, setJudgeSuggestions] = useState<
    { user_id: string; full_name: string }[]
  >([]);
  const [activeJudgeField, setActiveJudgeField] = useState<1 | 2 | 3 | null>(null);
  const [showJudgeDropdown, setShowJudgeDropdown] = useState(false);
  const judgeDropdownRef = useRef<HTMLDivElement | null>(null);

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

  // Klikk utenfor-lukking
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

  // Navigasjon
  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  // Finn dommer-id (returnerer null om navnet ikke finnes)
  async function findJudgeIdByName(name: string) {
    const clean = name.trim();
    if (!clean) return null;

    // Case-insensitive match på full_name
    const { data } = await supabase.from('profiles').select('user_id').ilike('full_name', clean);

    return data?.[0]?.user_id || null;
  }

  // Last opp bilder til Supabase (lagrer path/filnavn)
  async function uploadImages(userId: string) {
    if (!selectedFiles.length) return [];

    const paths: string[] = [];
    for (const file of selectedFiles) {
      const fileName = `${userId}/${Date.now()}-${file.name}`;

      const { error } = await supabase.storage.from('reports').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        console.error('Feil ved opplasting:', error);
        continue;
      }

      paths.push(fileName);
    }
    return paths;
  }

  // Lagre utkast
  const handleSaveDraft = async () => {
    if (loading) return;

    setLoading(true);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return router.push('/login');

      const [judge1Id, judge2Id, judge3Id] = await Promise.all([
        findJudgeIdByName(judge1),
        findJudgeIdByName(judge2),
        findJudgeIdByName(judge3),
      ]);

      const { error } = await supabase.from('judge_meeting_reports').insert({
        user_id: user.id,
        show_date: showDate || null,
        location,
        judge_1: judge1,
        judge_2: judge2,
        judge_3: judge3,
        judge_1_id: judge1Id,
        judge_2_id: judge2Id,
        judge_3_id: judge3Id,
        payload: {
          classLevel,
          riderName,
          horseName,
          totalPercent,
          highestPercent,
          lowestPercent,
          deviation,
          scores,
          comments,
          specialConditions,
          specialComment,
          otherCause,
          reflection,
          draft: true,
        },
      });

      if (error) {
        console.error(error);
        setMessage('Kunne ikke lagre utkast. Prøv igjen.');
        return;
      }

      setMessage('Utkast lagret!');
    } catch (e) {
      console.error(e);
      setMessage('Noe gikk galt ved lagring av utkast.');
    } finally {
      setLoading(false);
    }
  };

  // Send inn rapport (robust + hindrer dobbel-klikk + redirect alltid)
  const handleSubmit = async () => {
    if (loading) return;

    setLoading(true);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return router.push('/login');

      const [judge1Id, judge2Id, judge3Id] = await Promise.all([
        findJudgeIdByName(judge1),
        findJudgeIdByName(judge2),
        findJudgeIdByName(judge3),
      ]);

      // (valgfritt) last opp bilder
      const imagePaths = await uploadImages(user.id);

      const { data: inserted, error: insertError } = await supabase
        .from('judge_meeting_reports')
        .insert({
          user_id: user.id,
          show_date: showDate,
          location,
          judge_1: judge1,
          judge_2: judge2,
          judge_3: judge3,
          judge_1_id: judge1Id,
          judge_2_id: judge2Id,
          judge_3_id: judge3Id,
          payload: {
            classLevel,
            riderName,
            horseName,
            totalPercent,
            highestPercent,
            lowestPercent,
            deviation,
            scores,
            comments,
            specialConditions,
            specialComment,
            otherCause,
            reflection,
            imagePaths,
            draft: false,
          },
        })
        .select('id')
        .single();

      if (insertError || !inserted?.id) {
        console.error(insertError);
        setMessage('Kunne ikke lagre rapport. Prøv igjen.');
        return;
      }

      // Kall Edge Function (TEST)
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'send-judge-meeting-report',
        {
          body: {
            reportId: inserted.id,
            toEmail: 'cdv_bronzo@hotmail.com',
          },
        }
      );

      console.log('invoke result:', { fnData, fnError });

      if (fnError) {
        setMessage(`Edge function feilet: ${fnError.message}`);
        return;
      }

      setMessage(`Edge function OK: ${JSON.stringify(fnData)}`);

      // Når du er ferdig å teste:
      // router.push('/profile');
    } catch (e) {
      console.error(e);
      setMessage('Noe gikk galt ved innsending.');
    } finally {
      setLoading(false);
    }
  };

  // Stegindikator
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card space-y-6">
        <h1 className="text-2xl font-semibold text-deep-sea text-center">Ny dommermøterapport</h1>

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

        {/* --- STEG 1: Grunninfo --- */}
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
                />
              </div>
              <div>
                <label className="label">Lokasjon</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            {/* Dommer 1-3 med søk + dropdown + klikk-utenfor-lukking (men fritekst er lov) */}
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
                      setJudgeValue(f.n, e.target.value); // fritekst ok
                      setActiveJudgeField(f.n);
                      setShowJudgeDropdown(true);
                    }}
                    onFocus={() => {
                      setActiveJudgeField(f.n);
                      if (f.value.trim().length >= 2) setShowJudgeDropdown(true);
                    }}
                    className="input"
                    placeholder="Skriv navn"
                    autoComplete="off"
                  />

                  {showJudgeDropdown &&
                    activeJudgeField === f.n &&
                    filteredJudgeSuggestions.length > 0 && (
                      <div className="absolute z-50 bg-white border rounded shadow w-full mt-1 max-h-48 overflow-y-auto">
                        {filteredJudgeSuggestions.map((j) => (
                          <button
                            key={j.user_id}
                            type="button"
                            onClick={() => {
                              setJudgeValue(f.n, j.full_name);
                              setShowJudgeDropdown(false); // lukk ved valg
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
                />
              </div>
              <div>
                <label className="label">Rytter</label>
                <input
                  type="text"
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  className="input"
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
                />
              </div>
              <div>
                <label className="label">Total %</label>
                <input
                  type="number"
                  step="0.01"
                  value={totalPercent}
                  onChange={(e) => setTotalPercent(e.target.valueAsNumber || '')}
                  className="input"
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
                  onChange={(e) => setHighestPercent(e.target.valueAsNumber || '')}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Laveste %</label>
                <input
                  type="number"
                  step="0.01"
                  value={lowestPercent}
                  onChange={(e) => setLowestPercent(e.target.valueAsNumber || '')}
                  className="input"
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

        {/* --- STEG 2: Dommerrapport --- */}
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
                  forskjeller mellom dommerne. Målet er å forstå hva som førte til forskjellene og
                  fremme et mest mulig omforent syn i bedømmingen. Rapporten fylles ut ved at man
                  angir hvor stor betydning de følgende punktene hadde for avviket. 0 betyr ingen
                  påvirkning, mens 5 betyr stor påvirkning/hovedårsak.
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
                      onClick={() => setScores((prev) => ({ ...prev, [p]: v }))}
                      className={`px-3 h-10 rounded-md border text-sm font-semibold transition-all ${
                        scores[p] === v
                          ? 'bg-deep-sea text-white border-deep-sea'
                          : 'bg-white border-ocean-fog text-blue-sapphire hover:border-deep-sea'
                      }`}
                      title={v === 0 ? 'Ikke relevant' : String(v)}
                    >
                      {v === 0 ? 'Ikke relevant' : v}
                    </button>
                  ))}
                </div>

                {scores[p] !== undefined && scores[p] !== 0 && scores[p] !== '' && (
                  <textarea
                    value={comments[p] ?? ''}
                    onChange={(e) => setComments((prev) => ({ ...prev, [p]: e.target.value }))}
                    className="input"
                    placeholder="Kommentar (valgfritt)"
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

        {/* --- STEG 3: Refleksjon --- */}
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
                  onClick={() => setSpecialConditions(val)}
                  className={`px-5 py-2 rounded-md border font-medium transition-all ${
                    specialConditions === val
                      ? 'bg-deep-sea border-deep-sea text-white'
                      : 'bg-white border-ocean-fog text-blue-sapphire hover:border-deep-sea'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>

            {specialConditions === 'Ja' && (
              <textarea
                value={specialComment}
                onChange={(e) => setSpecialComment(e.target.value)}
                className="input"
                placeholder="Beskriv forholdene"
              />
            )}

            <div className="mt-4">
              <label className="label">Annen årsak til avvik</label>
              <input
                value={otherCause}
                onChange={(e) => setOtherCause(e.target.value)}
                className="input"
                placeholder="Annet relevant å bemerke"
              />
            </div>

            <div className="mt-4">
              <label className="label">Refleksjon fra dommermøte</label>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="input"
                placeholder="Skriv refleksjoner her"
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

        {/* --- STEG 4: Opplasting av protokoller --- */}
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

        {/* --- STEG 5: Oppsummering --- */}
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

            {previewUrls.length > 0 && (
              <>
                <h3 className="text-deep-sea font-semibold mt-4">Protokollbilder</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {previewUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Opplasting ${idx + 1}`}
                      className="rounded-md shadow-md w-full"
                    />
                  ))}
                </div>
              </>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-6">
              <button
                type="button"
                className="btn btn-secondary w-full sm:w-auto"
                onClick={prevStep}
                disabled={loading}
              >
                ← Forrige
              </button>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  className="btn btn-secondary w-full sm:w-auto"
                  onClick={handleSaveDraft}
                  disabled={loading}
                >
                  Lagre utkast
                </button>
                <button
                  type="button"
                  className="btn btn-primary w-full sm:w-auto"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Sender...' : 'Send inn rapport'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
