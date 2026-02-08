import { createServerClient } from '@supabase/ssr';

function parseCookieHeader(cookieHeader: string) {
  // En enkel parser som tåler de fleste cookie-strenger
  return cookieHeader
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf('=');
      if (idx === -1) return null;
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      return { name, value };
    })
    .filter(Boolean) as { name: string; value: string }[];
}

export function createSupabaseRouteClient(req: Request) {
  const cookieHeader = req.headers.get('cookie') ?? '';
  const parsed = parseCookieHeader(cookieHeader);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parsed;
        },
        setAll() {
          // I route handlers trenger vi ikke sette cookies for disse admin-kallene.
          // (Og i din Next-versjon er cookieStore ofte read-only.)
        },
      },
    }
  );
}
