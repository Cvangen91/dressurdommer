import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/supabase/lib/route';
import { createSupabaseServiceClient } from '@/supabase/lib/service';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  const supabase = createSupabaseRouteClient(req);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Next 15: params kan være Promise
  const params = await Promise.resolve(ctx.params);
  const memberId = params.id;

  if (!memberId) {
    return NextResponse.json({ error: 'Missing member id' }, { status: 400 });
  }

  const { data: me, error: meErr } = await supabase
    .from('profiles')
    .select('role, approval_status')
    .eq('id', user.id)
    .single();

  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 });

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
    .eq('id', memberId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
