import nodemailer from 'nodemailer';

type RateEntry = { count: number; resetAt: number };
const RATE: Map<string, RateEntry> = new Map();

// Anti-spam light
const WINDOW_MS = 10 * 60 * 1000; // 10 min
const MAX_PER_WINDOW = 4; // maks 4 per 10 min per IP

function getIp(req: Request) {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

function tooManyRequests(ip: string) {
  const now = Date.now();
  const entry = RATE.get(ip);

  if (!entry || now > entry.resetAt) {
    RATE.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  RATE.set(ip, entry);
  return entry.count > MAX_PER_WINDOW;
}

function countUrls(text: string) {
  const matches = text.match(/https?:\/\/|www\./gi);
  return matches ? matches.length : 0;
}

function isNonEmptyString(v: unknown, maxLen: number) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= maxLen;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = body?.name;
    const email = body?.email;
    const message = body?.message;
    const website = body?.website ?? ''; // honeypot
    const startedAt = body?.startedAt;

    // Basic validering
    if (!isNonEmptyString(name, 80)) {
      return Response.json({ error: 'Ugyldig navn.' }, { status: 400 });
    }
    if (!isNonEmptyString(email, 120) || !/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json({ error: 'Ugyldig e-post.' }, { status: 400 });
    }
    if (!isNonEmptyString(message, 4000)) {
      return Response.json({ error: 'Ugyldig melding.' }, { status: 400 });
    }
    if (typeof startedAt !== 'number' || !Number.isFinite(startedAt)) {
      return Response.json({ error: 'Ugyldig innsending.' }, { status: 400 });
    }

    // 1) Honeypot: bots fyller ofte ut skjulte felt
    if (typeof website === 'string' && website.trim().length > 0) {
      return Response.json({ ok: true }, { status: 200 });
    }

    const ip = getIp(req);

    // 2) Rate limit
    if (tooManyRequests(ip)) {
      return Response.json(
        { error: 'For mange forsøk. Vent litt og prøv igjen.' },
        { status: 429 }
      );
    }

    // 3) Tids-sjekk: sendt “for fort” => bot
    const now = Date.now();
    if (startedAt > now || now - startedAt < 4000) {
      return Response.json({ error: 'Vennligst prøv igjen.' }, { status: 400 });
    }

    // 4) Lenke-spam
    if (countUrls(message) > 2) {
      return Response.json({ error: 'Meldingen inneholder for mange lenker.' }, { status: 400 });
    }

    // SMTP / one.com
    const host = process.env.SMTP_HOST || 'send.one.com';
    const port = Number(process.env.SMTP_PORT || '587');
    const secure = (process.env.SMTP_SECURE || 'false') === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    const mailFrom = process.env.MAIL_FROM || 'Dressurdommer.no <post@dressurdommer.no>';
    const mailTo = process.env.MAIL_TO || 'post@dressurdommer.no';

    if (!user || !pass) {
      return Response.json(
        { error: 'E-post er ikke konfigurert (SMTP_USER/PASS mangler).' },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      requireTLS: !secure,
    });

    await transporter.sendMail({
      from: mailFrom,
      to: mailTo,
      replyTo: email,
      subject: `Ny melding fra kontaktskjema: ${name}`,
      text: `Navn: ${name}\nE-post: ${email}\nIP: ${ip}\n\nMelding:\n${message}\n`,
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch {
    return Response.json({ error: 'Serverfeil. Prøv igjen senere.' }, { status: 500 });
  }
}
