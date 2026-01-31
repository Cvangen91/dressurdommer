'use client';

import { useState, FormEvent } from 'react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  // Honeypot (skal være tom)
  const [website, setWebsite] = useState('');

  // Tids-sjekk: når siden ble lastet
  const [startedAt] = useState(() => Date.now());

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setStatus('sending');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, website, startedAt }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus('error');
        setFeedback(data?.error ?? 'Noe gikk galt. Prøv igjen.');
        return;
      }

      setStatus('success');
      setFeedback('Takk! Meldingen er sendt.');
      setName('');
      setEmail('');
      setMessage('');
      setWebsite('');
    } catch {
      setStatus('error');
      setFeedback('Kunne ikke sende. Sjekk nett og prøv igjen.');
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <section className="card">
        <div className="space-y-2 mb-6">
          <h1 className="text-2xl font-semibold text-[--deep-sea]">Kontakt</h1>
          <p className="text-muted">
            Send oss en melding via skjemaet under, så svarer vi så fort vi kan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Navn</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              maxLength={80}
            />
          </div>

          <div>
            <label className="label">E-post</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              maxLength={120}
            />
          </div>

          <div>
            <label className="label">Melding</label>
            <textarea
              className="input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              maxLength={4000}
              rows={7}
            />
          </div>

          {/* Honeypot (skjult) */}
          <div className="hidden" aria-hidden="true">
            <label className="label">Website</label>
            <input
              className="input"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 mt-2">
            <button
              type="submit"
              className="btn btn-primary w-full md:w-auto"
              disabled={status === 'sending'}
            >
              {status === 'sending' ? 'Sender…' : 'Send melding'}
            </button>

            {status === 'success' && feedback && (
              <span className="text-green-600 text-sm self-center">{feedback}</span>
            )}

            {status === 'error' && feedback && (
              <span className="text-red-600 text-sm self-center">{feedback}</span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
