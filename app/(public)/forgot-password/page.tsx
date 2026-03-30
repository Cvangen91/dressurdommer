'use client';

import { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setMessage('Hvis e-posten finnes hos oss, har vi sendt deg en lenke for å sette nytt passord.');
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-[--color-background] px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-semibold text-[--deep-sea] mb-6 text-center">Glemt passord</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">E-post</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="din@epost.no"
              required
            />
          </div>

          {message && <p className="text-sm text-center text-[--deep-sea]">{message}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Sender...' : 'Send reset-lenke'}
          </button>
        </form>

        <p className="text-muted text-center mt-6">
          <a href="/login" className="hover:underline">
            Tilbake til logg inn
          </a>
        </p>
      </div>
    </div>
  );
}
