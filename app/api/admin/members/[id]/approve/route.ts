import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseRouteClient } from '@/supabase/lib/route';
import { createSupabaseServiceClient } from '@/supabase/lib/service';

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const cookieStore = await cookies();
  const supabase = createSupabaseRouteClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: me } = await supabase
    .from('profiles')
    .select('role, approval_status')
    .eq('id', user.id)
    .single();

  if (!me || me.role !== 'admin' || me.approval_status !== 'approved') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const service = createSupabaseServiceClient();
  const { error } = await service
    .from('profiles')
    .update({
      approval_status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      rejection_reason: null,
    })
    .eq('id', ctx.params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
