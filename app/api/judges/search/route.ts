import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/supabase/lib/route';
import { createSupabaseServiceClient } from '@/supabase/lib/service';

export async function GET(req: Request) {
  const supabase = createSupabaseRouteClient(req);
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();

  if (q.length < 1) {
    return NextResponse.json({ judges: [] });
  }

  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from('profiles')
    .select('user_id, full_name')
    .not('full_name', 'is', null)
    .ilike('full_name', `%${q}%`)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const qLower = q.toLowerCase();
  const judges = (data ?? [])
    .filter((j) => typeof j.full_name === 'string' && j.full_name.trim().length > 0)
    .sort((a, b) => {
      const aName = a.full_name.toLowerCase();
      const bName = b.full_name.toLowerCase();
      const aStarts = aName.startsWith(qLower) ? 0 : 1;
      const bStarts = bName.startsWith(qLower) ? 0 : 1;

      if (aStarts !== bStarts) return aStarts - bStarts;
      return aName.localeCompare(bName, 'nb');
    });

  return NextResponse.json({ judges });
}
