import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServiceClient } from '@/supabase/lib/service';

type ReportJudge = {
  position?: 'C' | 'M' | 'H' | 'B' | 'E';
  name?: string;
  user_id?: string | null;
  percent?: number | null;
  resultNumber?: number | null;
};

function normalizeName(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((v): v is string => Boolean(v)))];
}

async function backfillExistingReportsForProfile(
  service: ReturnType<typeof createSupabaseServiceClient>,
  profileName: string,
  profileUserId: string
) {
  const targetName = normalizeName(profileName);
  if (!targetName) return;

  const { data: reports, error } = await service
    .from('judge_meeting_reports')
    .select('id, judges, judge_user_ids')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error || !reports?.length) return;

  for (const report of reports) {
    const judges = Array.isArray(report.judges) ? (report.judges as ReportJudge[]) : [];
    if (!judges.length) continue;

    let changed = false;
    const nextJudges = judges.map((judge) => {
      if (judge?.user_id) return judge;

      const sameName = normalizeName(judge?.name) === targetName;
      if (!sameName) return judge;

      changed = true;
      return { ...judge, user_id: profileUserId };
    });

    if (!changed) continue;

    const existingIds = Array.isArray(report.judge_user_ids) ? report.judge_user_ids : [];
    const nextIds = uniqueIds([...existingIds, ...nextJudges.map((judge) => judge.user_id)]);

    await service
      .from('judge_meeting_reports')
      .update({
        judges: nextJudges,
        judge_user_ids: nextIds,
      })
      .eq('id', report.id);
  }
}

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const full_name = String(body?.full_name ?? '').trim();
  const email = String(body?.email ?? '')
    .trim()
    .toLowerCase();
  const password = String(body?.password ?? '');

  const birthday = body?.birthday ?? null;
  const judge_level = body?.judge_level ?? null;
  const judge_start = body?.judge_start ?? null;
  const rider_district = body?.rider_district ?? null;

  if (!full_name) return badRequest('Fullt navn mangler.');
  if (!email) return badRequest('E-post mangler.');
  if (!password || password.length < 6) return badRequest('Passord må være minst 6 tegn.');

  // 1) Opprett Auth-bruker via ANON (beholder vanlig signup-flow / ev. email confirmation)
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: signUpData, error: signUpError } = await anon.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name, // lagres i auth.users.raw_user_meta_data
      },
    },
  });

  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 400 });
  }

  const userId = signUpData.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Kunne ikke opprette bruker.' }, { status: 500 });
  }

  // 2) Opprett profile via SERVICE ROLE (slipper RLS)
  const service = createSupabaseServiceClient();

  const { error: profileError } = await service.from('profiles').insert({
    id: userId,
    user_id: userId,
    full_name,
    birthday,
    judge_level,
    judge_start,
    rider_district,
    approval_status: 'pending',
    role: 'user',
    requested_at: new Date().toISOString(),
  });

  if (profileError) {
    // 3) Rydd opp: slett auth-user hvis profile feiler -> ingen orphan users
    await service.auth.admin.deleteUser(userId).catch(() => {});
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // 4) Koble ny profil til eksisterende rapporter med samme dommernavn.
  // Feil her skal ikke stoppe signup; dette er en etterfylling.
  await backfillExistingReportsForProfile(service, full_name, userId).catch(() => {});

  return NextResponse.json({
    ok: true,
    message:
      'Bruker opprettet. Hvis e-postbekreftelse er på, sjekk e-post og logg inn etter bekreftelse.',
  });
}
