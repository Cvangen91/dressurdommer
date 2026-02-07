'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

import Pagination from '@/components/Pagination';
import SearchInput from '@/components/SearchInput';
import SelectFilter from '@/components/SelectFilter';

const JUDGE_LEVELS = ['DDA', 'DD1', 'DD2', 'DD3', 'DD4', 'FEI'];

interface Notification {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

type JudgeMeetingReportStatus = 'draft' | 'submitted';

interface Report {
  id: string;
  show_date: string | null;
  location: string | null;
  created_at: string;
  updated_at: string | null;
  status: JudgeMeetingReportStatus | null; // null = gamle rader uten status -> behandles som draft
  submitted_at: string | null;
  payload?: { draft?: boolean | null } | null; // fallback for eldre data
}

interface ObservationYearSummary {
  id: string;
  year: number;
  status: 'open' | 'submitted' | 'approved';
  last_observation_date: string | null;
}

type ReportSort = 'date_desc' | 'date_asc';

export default function ProfilePage() {
  const router = useRouter();

  const [editing, setEditing] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [judgeLevel, setJudgeLevel] = useState('');
  const [riderDistrict, setRiderDistrict] = useState('');
  const [birthday, setBirthday] = useState('');
  const [judgeStart, setJudgeStart] = useState('');

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [observationYears, setObservationYears] = useState<ObservationYearSummary[]>([]);
  const [creatingObservation, setCreatingObservation] = useState(false);

  // ✅ Rapporter: søk + sort + pagination
  const [reportSearch, setReportSearch] = useState('');
  const [reportSort, setReportSort] = useState<ReportSort>('date_desc');
  const [currentReportPage, setCurrentReportPage] = useState(1);
  const REPORTS_PER_PAGE = 6;

  // 🔹 Hent profil og rapporter
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setEmail(user.email ?? '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || '');
        setJudgeLevel(profile.judge_level || '');
        setRiderDistrict(profile.rider_district || '');
        setBirthday(profile.birthday || '');
        setJudgeStart(profile.judge_start || '');

        setIsAdmin(profile.role === 'admin' && profile.approval_status === 'approved');
      }

      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('id, title, message, link, is_read, created_at')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (notificationsData) setNotifications(notificationsData as Notification[]);

      // ✅ Rapporter: hent status + submitted_at + updated_at (+ payload som fallback)
      const { data: reportsData } = await supabase
        .from('judge_meeting_reports')
        .select('id, show_date, location, created_at, updated_at, status, submitted_at, payload')
        .eq('user_id', user.id)
        .order('show_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (reportsData) setReports(reportsData as Report[]);

      const { data: obsYears } = await supabase
        .from('observation_year')
        .select(
          `
            id,
            year,
            status,
            observations (
              date
            )
          `
        )
        .eq('observer_id', user.id)
        .order('year', { ascending: false });

      if (obsYears) {
        const summaries = (obsYears as any[]).map((y: any) => {
          const dates = (y.observations ?? [])
            .map((o: any) => o.date)
            .sort()
            .reverse();

          return {
            id: y.id,
            year: y.year,
            status: y.status,
            last_observation_date: dates[0] ?? null,
          } as ObservationYearSummary;
        });

        setObservationYears(summaries);
      }

      setLoading(false);
    };

    fetchData();
  }, [router]);

  // 🔹 Lagre endringer inkl. e-post
  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        birthday: birthday || null,
        judge_level: judgeLevel || null,
        judge_start: judgeStart || null,
        rider_district: riderDistrict || null,
      })
      .eq('user_id', user.id);

    const { error: emailError } = await supabase.auth.updateUser({ email });

    if (profileError || emailError) {
      setMessage('Kunne ikke lagre endringer.');
    } else {
      setMessage('Profilen ble oppdatert!');
      setEditing(false);
    }

    setSaving(false);
  }

  // ✅ Ny bisitting: sørg for årlig skjema og gå direkte til new observation
  async function handleNewObservation() {
    try {
      setCreatingObservation(true);
      setMessage(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const currentYear = new Date().getFullYear();

      const { data: existing, error: existingError } = await supabase
        .from('observation_year')
        .select('id, year, status')
        .eq('observer_id', user.id)
        .eq('year', currentYear)
        .maybeSingle();

      if (existingError) {
        setMessage('Kunne ikke hente bisittingsskjema for året.');
        return;
      }

      let yearId = existing?.id as string | undefined;

      if (!yearId) {
        const { data: created, error: createError } = await supabase
          .from('observation_year')
          .insert({
            observer_id: user.id,
            year: currentYear,
            status: 'open',
          })
          .select('id, year, status')
          .single();

        if (createError || !created) {
          setMessage('Kunne ikke opprette bisittingsskjema for året.');
          return;
        }

        yearId = created.id;

        setObservationYears((prev) => {
          const alreadyThere = prev.some((p) => p.id === created.id);
          if (alreadyThere) return prev;

          const next: ObservationYearSummary = {
            id: created.id,
            year: created.year,
            status: created.status,
            last_observation_date: null,
          };

          return [next, ...prev].sort((a, b) => b.year - a.year);
        });
      }

      router.push(`/observations/${yearId}/new`);
    } finally {
      setCreatingObservation(false);
    }
  }

  // ✅ Status: kun "utkast" eller "sendt inn"
  const getReportStatus = (r: Report): JudgeMeetingReportStatus => {
    if (r.status === 'submitted') return 'submitted';
    if (r.status === 'draft') return 'draft';

    // fallback for gamle rader uten status: bruk payload.draft hvis den finnes
    if (r.payload && typeof r.payload.draft === 'boolean') {
      return r.payload.draft ? 'draft' : 'submitted';
    }

    // default: utkast
    return 'draft';
  };

  const badgeText = (status: JudgeMeetingReportStatus) =>
    status === 'submitted' ? 'Sendt inn' : 'Utkast';

  // ✅ Farger: utkast = oransje, sendt inn = grønn
  const badgeClass = (status: JudgeMeetingReportStatus) =>
    status === 'submitted' ? 'badge badge-submitted' : 'badge badge-pending';

  const reportMetaText = (r: Report, status: JudgeMeetingReportStatus) => {
    const fmt = (d: string) => new Date(d).toLocaleDateString('no-NO');

    if (status === 'submitted') {
      const when = r.submitted_at || r.created_at;
      return `Sendt inn: ${fmt(when)}`;
    }

    const when = r.updated_at || r.created_at;
    return `Sist lagret: ${fmt(when)}`;
  };

  // ✅ Rapporter: filter + sort i UI
  const filteredSortedReports = useMemo(() => {
    const q = reportSearch.trim().toLowerCase();

    const filtered = q
      ? reports.filter((r) => (r.location || '').toLowerCase().includes(q))
      : reports;

    const toDateValue = (s?: string | null) => {
      if (!s) return 0;
      const t = Date.parse(s);
      return Number.isNaN(t) ? 0 : t;
    };

    const primarySortValue = (r: Report) => {
      const status = getReportStatus(r);
      return (
        toDateValue(r.show_date) ||
        (status === 'draft'
          ? toDateValue(r.updated_at) || toDateValue(r.created_at)
          : toDateValue(r.submitted_at) || toDateValue(r.created_at))
      );
    };

    return [...filtered].sort((a, b) => {
      const aPrimary = primarySortValue(a);
      const bPrimary = primarySortValue(b);

      return reportSort === 'date_desc' ? bPrimary - aPrimary : aPrimary - bPrimary;
    });
  }, [reports, reportSearch, reportSort]);

  // ✅ Rapporter: pagination
  const totalReportPages = Math.max(1, Math.ceil(filteredSortedReports.length / REPORTS_PER_PAGE));

  const pagedReports = useMemo(() => {
    const safePage = Math.min(currentReportPage, totalReportPages);
    const start = (safePage - 1) * REPORTS_PER_PAGE;
    return filteredSortedReports.slice(start, start + REPORTS_PER_PAGE);
  }, [filteredSortedReports, currentReportPage, totalReportPages]);

  // Reset til side 1 når søk/sort endres
  useEffect(() => {
    setCurrentReportPage(1);
  }, [reportSearch, reportSort]);

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* 🔹 PROFILSEKSJON */}
      <section className="card">
        {!editing ? (
          <>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
              <div>
                <h1 className="text-2xl font-semibold text-[--deep-sea] mb-2">
                  {fullName || 'Ukjent dommer'}
                </h1>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">E-post:</span> {email || '—'}
                  </p>
                  <p>
                    <span className="font-medium">Dommernivå:</span>{' '}
                    {judgeLevel || 'Ikke registrert'}
                  </p>
                  <p>
                    <span className="font-medium">Rytterkrets:</span>{' '}
                    {riderDistrict || 'Ikke oppgitt'}
                  </p>
                  {birthday && (
                    <p>
                      <span className="font-medium">Fødselsdato:</span> {birthday}
                    </p>
                  )}
                  {judgeStart && (
                    <p>
                      <span className="font-medium">Startet som dommer:</span> {judgeStart}
                    </p>
                  )}
                </div>
              </div>

              <div className="min-w-[260px]">
                <div className="space-y-3">
                  {notifications.length === 0 ? (
                    <p className="text-muted text-sm">Ingen varsler akkurat nå.</p>
                  ) : (
                    notifications.map((n) => {
                      const link = n.link;
                      return (
                        <div
                          key={n.id}
                          className="border rounded-md p-3 flex justify-between items-center"
                        >
                          <div>
                            <p className="text-sm font-medium">{n.title}</p>
                            {n.message && <p className="text-xs text-muted">{n.message}</p>}
                          </div>

                          {link && (
                            <button onClick={() => router.push(link)} className="btn btn-secondary">
                              Se
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {message && <p className="text-green-600 mt-4">{message}</p>}
          </>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <h2 className="text-xl font-semibold text-[--deep-sea] mb-4">Rediger profil</h2>

            <div>
              <label className="label">Fullt navn</label>
              <input
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">E-post</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-muted text-xs mt-1">
                Du må bekrefte ny e-postadresse hvis du endrer den.
              </p>
            </div>

            <div>
              <label className="label">Dommernivå</label>
              <select
                value={judgeLevel}
                onChange={(e) => setJudgeLevel(e.target.value)}
                className="input"
              >
                <option value="">Velg nivå</option>
                {JUDGE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Rytterkrets</label>
              <input
                className="input"
                value={riderDistrict}
                onChange={(e) => setRiderDistrict(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Fødselsdato</label>
                <input
                  className="input"
                  type="date"
                  value={birthday || ''}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Startet som dommer</label>
                <input
                  className="input"
                  type="date"
                  value={judgeStart || ''}
                  onChange={(e) => setJudgeStart(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mt-4">
              <button type="submit" disabled={saving} className="btn btn-primary w-full md:w-auto">
                {saving ? 'Lagrer...' : 'Lagre endringer'}
              </button>
              <button
                type="button"
                className="btn btn-secondary w-full md:w-auto"
                onClick={() => setEditing(false)}
              >
                Avbryt
              </button>
            </div>

            {message && <p className="text-green-600 text-sm">{message}</p>}
          </form>
        )}

        <div className="mt-8 flex flex-col md:flex-row gap-4">
          <button onClick={() => setEditing(true)} className="btn btn-primary">
            Rediger profil
          </button>

          {isAdmin && (
            <button onClick={() => router.push('/admin/members')} className="btn btn-primary">
              Administrer medlemmer
            </button>
          )}

          <button onClick={() => router.push('/report-new')} className="btn btn-primary">
            Ny dommermøterapport
          </button>

          <button
            onClick={handleNewObservation}
            className="btn btn-primary"
            disabled={creatingObservation}
          >
            {creatingObservation ? 'Oppretter...' : 'Ny bisitting'}
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text[--deep-sea] mb-4">Dine bisittingsskjemaer</h2>

        {observationYears.length === 0 ? (
          <p className="text-muted">Du har ikke registrert noen bisittinger enda.</p>
        ) : (
          <div className="space-y-4">
            {observationYears.map((year) => (
              <div
                key={year.id}
                className="card cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/observations/${year.id}`)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-[--deep-sea]">{year.year}</p>

                    {year.last_observation_date && (
                      <p className="text-xs text-muted">
                        Sist redigert:{' '}
                        {new Date(year.last_observation_date).toLocaleDateString('no-NO')}
                      </p>
                    )}
                  </div>

                  <span
                    className={`badge ${
                      year.status === 'submitted' ? 'badge-submitted' : 'badge-pending'
                    }`}
                  >
                    {year.status === 'submitted' ? 'Sendt inn' : 'Pågår'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 🔹 RAPPORTER */}
      <section className="card">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-[--deep-sea]">Dine dommermøterapporter</h2>

          <div className="w-full md:w-auto flex flex-col md:flex-row gap-3">
            <SearchInput
              label="Søk"
              placeholder="Søk på stevnested..."
              value={reportSearch}
              onChange={setReportSearch}
              className="w-full md:w-[260px]"
            />

            <SelectFilter
              label="Sorter"
              value={reportSort}
              onChange={setReportSort}
              className="w-full md:w-[220px]"
              options={[
                { value: 'date_desc', label: 'Nyeste først' },
                { value: 'date_asc', label: 'Eldste først' },
              ]}
            />
          </div>
        </div>

        {loading ? (
          <p className="text-muted">Laster rapporter...</p>
        ) : filteredSortedReports.length === 0 ? (
          <p className="text-muted">Ingen rapporter matcher søket.</p>
        ) : (
          <>
            <div className="space-y-4">
              {pagedReports.map((report) => {
                const status = getReportStatus(report);

                return (
                  <div
                    key={report.id}
                    className="card cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() =>
                      status === 'draft'
                        ? router.push(`/report/edit/${report.id}`)
                        : router.push(`/report/${report.id}`)
                    }
                  >
                    {/* MOBIL */}
                    <div className="md:hidden space-y-2">
                      {/* Sted får full bredde og wrap */}
                      <p className="font-medium text-[--deep-sea] whitespace-normal break-words">
                        {report.location || 'Ukjent sted'}
                      </p>

                      {/* Stevnedato + status på samme linje */}
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted">
                          Stevnedato:{' '}
                          {report.show_date
                            ? new Date(report.show_date).toLocaleDateString('no-NO')
                            : '—'}
                        </p>

                        <span className={badgeClass(status)}>{badgeText(status)}</span>
                      </div>

                      {/* Meta under */}
                      <p className="text-xs text-muted">{reportMetaText(report, status)}</p>
                    </div>

                    {/* DESKTOP */}
                    <div className="hidden md:flex justify-between items-center gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-[--deep-sea] truncate">
                          {report.location || 'Ukjent sted'}
                        </p>
                        <p className="text-sm text-muted">
                          Stevnedato:{' '}
                          {report.show_date
                            ? new Date(report.show_date).toLocaleDateString('no-NO')
                            : '—'}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={badgeClass(status)}>{badgeText(status)}</span>
                        <p className="text-xs text-muted whitespace-nowrap">
                          {reportMetaText(report, status)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              currentPage={currentReportPage}
              totalPages={totalReportPages}
              onPageChange={setCurrentReportPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
