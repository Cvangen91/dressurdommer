import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServiceClient } from '@/supabase/lib/service';

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

  // 0) Service role må finnes – ellers får du auth users uten profiles
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'Mangler SUPABASE_SERVICE_ROLE_KEY i environment.' },
      { status: 500 }
    );
  }

  // 1) Opprett auth user (anon key)
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: signUpData, error: signUpError } = await anon.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });

  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 400 });
  }

  const userId = signUpData.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Kunne ikke opprette bruker.' }, { status: 500 });
  }

  // 2) Opprett profile via service role
  const service = createSupabaseServiceClient();

  const { data: createdProfile, error: profileError } = await service
    .from('profiles')
    .insert({
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
    })
    .select('id')
    .single();

  if (profileError || !createdProfile) {
    // Cleanup: slett auth user, så du ikke får orphan users
    await service.auth.admin.deleteUser(userId).catch(() => {});
    return NextResponse.json(
      { error: profileError?.message || 'Profil ble ikke opprettet.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
