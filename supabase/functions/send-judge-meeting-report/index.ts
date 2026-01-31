import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Payload = {
  classLevel?: string;
  riderName?: string;
  horseName?: string;
  totalPercent?: number | '';
  highestPercent?: number | '';
  lowestPercent?: number | '';
  deviation?: string;
  scores?: Record<string, number | ''>;
  comments?: Record<string, string>;
  specialConditions?: string;
  specialComment?: string;
  otherCause?: string;
  reflection?: string;
  imagePaths?: string[];
  draft?: boolean;
};

Deno.serve(async (req) => {
  try {
    // ✅ CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders,
      });
    }

    const { reportId, toEmail } = await req.json();
    if (!reportId || !toEmail) {
      return new Response('Missing reportId/toEmail', {
        status: 400,
        headers: corsHeaders,
      });
    }

    const PROJECT_URL = Deno.env.get('PROJECT_URL');
    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Dressurdommer.no <post@dressurdommer.no>';

    if (!PROJECT_URL || !SERVICE_ROLE_KEY || !RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            'Missing env. Need PROJECT_URL, SERVICE_ROLE_KEY, RESEND_API_KEY (and optionally FROM_EMAIL).',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY);
    const resend = new Resend(RESEND_API_KEY);

    // 1) Hent rapport fra DB
    const { data: report, error: reportErr } = await supabase
      .from('judge_meeting_reports')
      .select('id, user_id, show_date, location, judge_1, judge_2, judge_3, payload, created_at')
      .eq('id', reportId)
      .single();

    if (reportErr || !report) {
      console.error(reportErr);
      return new Response(JSON.stringify({ ok: false, error: 'Report not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = (report.payload || {}) as Payload;

    // 2) Lag PDF
    const pdfBytes = await generatePdf({
      reportId: report.id,
      showDate: report.show_date,
      location: report.location,
      judges: [report.judge_1, report.judge_2, report.judge_3].filter(Boolean),
      payload,
      createdAt: report.created_at,
    });

    // 3) Last ned protokollbilder (private storage)
    const imagePaths = payload.imagePaths || [];
    const imageAttachments = await Promise.all(
      imagePaths.map(async (path, idx) => {
        const { data, error } = await supabase.storage.from('reports').download(path);

        if (error || !data) {
          console.error('Image download error:', path, error);
          return null;
        }

        const bytes = new Uint8Array(await data.arrayBuffer());
        const lower = path.toLowerCase();
        const isPng = lower.endsWith('.png');
        const isJpg = lower.endsWith('.jpg') || lower.endsWith('.jpeg');

        return {
          filename: `protokoll-${idx + 1}${isPng ? '.png' : isJpg ? '.jpg' : ''}`,
          content: toBase64(bytes),
          contentType: isPng ? 'image/png' : isJpg ? 'image/jpeg' : 'application/octet-stream',
        };
      })
    );

    // 4) Send epost (Resend)
    const subject =
      `Dommermøterapport – ${report.show_date || 'uten dato'} – ${report.location || ''}`.trim();

    const emailRes = await resend.emails.send({
      from: FROM_EMAIL,
      to: [toEmail],
      subject,
      html: `
        <p>Ny dommermøterapport er sendt inn.</p>
        <ul>
          <li><b>Dato:</b> ${escapeHtml(report.show_date || '-')}</li>
          <li><b>Lokasjon:</b> ${escapeHtml(report.location || '-')}</li>
          <li><b>Dommere:</b> ${escapeHtml([report.judge_1, report.judge_2, report.judge_3].filter(Boolean).join(', '))}</li>
        </ul>
        <p>PDF av rapporten ligger vedlagt. Protokollbilder er vedlagt som separate filer.</p>
        <p>Produsert på dressurdommer.no</p>
      `,
      attachments: [
        {
          filename: `dommermoterapport-${report.id}.pdf`,
          content: toBase64(new Uint8Array(pdfBytes)),
          contentType: 'application/pdf',
        },
        ...imageAttachments.filter(Boolean),
      ],
    });

    if (emailRes.error) {
      console.error('Resend error:', emailRes.error);
      return new Response(JSON.stringify({ ok: false, error: emailRes.error }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/* ------------------------- PDF GENERATOR ------------------------- */

async function generatePdf(input: {
  reportId: string;
  showDate: string | null;
  location: string | null;
  judges: string[];
  payload: Payload;
  createdAt: string;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const pageWidth = 595.28;
  const contentWidth = pageWidth - margin * 2;
  const footerText = 'Produsert på dressurdommer.no';

  let y = 800;

  const line = (text: string, size = 11, isBold = false) => {
    page.drawText(text, { x: margin, y, size, font: isBold ? bold : font });
    y -= size + 6;
  };

  const wrap = (text: string, maxWidth: number, size: number) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      const test = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) current = test;
      else {
        if (current) lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  // Header
  line('Dommermøterapport', 18, true);
  line(`Rapport-ID: ${input.reportId}`, 9);
  line(`Opprettet: ${new Date(input.createdAt).toLocaleString('no-NO')}`, 9);
  y -= 10;

  line(`Dato: ${input.showDate || '-'}`, 12, true);
  line(`Lokasjon: ${input.location || '-'}`, 12, true);
  line(`Dommere: ${input.judges.length ? input.judges.join(', ') : '-'}`, 11);
  y -= 12;

  const p = input.payload;

  line('Grunninfo', 14, true);
  line(`Klasse/program: ${p.classLevel || '-'}`);
  line(`Rytter: ${p.riderName || '-'}`);
  line(`Hest: ${p.horseName || '-'}`);
  line(`Total %: ${p.totalPercent ?? '-'}`);
  line(`Høyeste %: ${p.highestPercent ?? '-'}`);
  line(`Laveste %: ${p.lowestPercent ?? '-'}`);
  line(`Avvik %: ${p.deviation ?? '-'}`);
  y -= 12;

  // Tabell
  line('Vurderingspunkter', 14, true);
  y -= 6;

  const col1 = margin; // Punkt
  const col2 = margin + 290; // Score
  const col3 = margin + 350; // Kommentar
  const right = margin + contentWidth;

  // Header row
  page.drawText('Punkt', { x: col1, y, size: 10, font: bold });
  page.drawText('Score', { x: col2, y, size: 10, font: bold });
  page.drawText('Kommentar', { x: col3, y, size: 10, font: bold });
  y -= 8;

  page.drawLine({
    start: { x: margin, y },
    end: { x: right, y },
    thickness: 1,
  });
  y -= 10;

  const scores = p.scores || {};
  const comments = p.comments || {};

  const rows = Object.keys(scores)
    .map((k) => ({ point: k, score: scores[k], comment: comments[k] || '' }))
    .filter((r) => r.score !== 0 && r.score !== '' && r.score !== undefined);

  for (const r of rows) {
    const point = r.point;
    const score = String(r.score ?? '');
    const comment = (r.comment || '').trim();

    const commentWidth = right - col3;
    const wrappedComment = comment ? wrap(comment, commentWidth, 9) : [''];

    // row height
    const rowHeight = Math.max(1, wrappedComment.length) * 12;

    // avoid footer collision
    if (y - rowHeight < 70) break;

    page.drawText(point, { x: col1, y, size: 9, font });
    page.drawText(score, { x: col2, y, size: 9, font });

    let cy = y;
    for (const l of wrappedComment) {
      if (l) page.drawText(l, { x: col3, y: cy, size: 9, font });
      cy -= 12;
    }

    y -= rowHeight;
    page.drawLine({
      start: { x: margin, y: y + 4 },
      end: { x: right, y: y + 4 },
      thickness: 0.5,
    });
    y -= 6;
  }

  y -= 6;

  line('Refleksjon', 14, true);
  line(`Spesielle forhold: ${p.specialConditions || '-'}`, 10, true);

  if (p.specialConditions === 'Ja' && p.specialComment) {
    for (const l of wrap(p.specialComment, contentWidth, 10)) line(`- ${l}`, 10);
  }

  if (p.otherCause) {
    line('Annen årsak til avvik:', 10, true);
    for (const l of wrap(p.otherCause, contentWidth, 10)) line(l, 10);
  }

  if (p.reflection) {
    line('Refleksjon fra dommermøte:', 10, true);
    for (const l of wrap(p.reflection, contentWidth, 10)) line(l, 10);
  }

  // Footer
  const footerSize = 9;
  const footerWidth = font.widthOfTextAtSize(footerText, footerSize);
  page.drawText(footerText, {
    x: (pageWidth - footerWidth) / 2,
    y: 30,
    size: footerSize,
    font,
  });

  return await pdf.save();
}

/* ------------------------- helpers ------------------------- */

function toBase64(bytes: Uint8Array): string {
  // chunked to avoid stack issues
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function escapeHtml(str: string) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
