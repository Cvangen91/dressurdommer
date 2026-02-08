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

  const { data: me } = await supabase
    .from('profiles')
    .select('role, approval_status')
    .eq('id', user.id)
    .single();

  if (!me || me.role !== 'admin' || me.approval_status !== 'approved') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const params = await Promise.resolve(ctx.params);
  const memberId = params.id;

  if (!memberId) {
    return NextResponse.json({ error: 'Missing member id' }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    reason?: string;
  };

  const reason =
    typeof body.reason === 'string' && body.reason.trim().length > 0 ? body.reason.trim() : null;

  const service = createSupabaseServiceClient();
  const { error } = await service
    .from('profiles')
    .update({
      approval_status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      rejection_reason: reason && reason.length > 0 ? reason : null,
    })
    .eq('id', memberId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
