'use client';

import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [validSession, setValidSession] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // 🔍 Sjekk om recovery session finnes
  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setValidSession(false);
        setMessage('Lenken er utløpt eller ugyldig. Be om ny reset-lenke.');
      } else {
        setEmail(data.session.user.email ?? null);
      }

      setCheckingSession(false);
    }

    checkSession();
  }, []);

  // 🔐 Oppdater passord
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage('Passordene er ikke like');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setMessage('Passordet er oppdatert!');

    setTimeout(() => {
      router.push('/login');
    }, 2000);
  }

  // 🔁 Send ny reset-lenke
  async function resendReset() {
    if (!email) {
      setMessage('Kunne ikke finne e-post. Gå tilbake og prøv igjen.');
      return;
    }

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setMessage('Ny reset-lenke er sendt!');
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Laster...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--color-background] px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-semibold text-[--deep-sea] mb-6 text-center">
          Sett nytt passord
        </h1>

        {!validSession ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-red-600">{message}</p>

            <button onClick={resendReset} className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Sender...' : 'Send ny lenke'}
            </button>

            <a href="/forgot-password" className="text-sm hover:underline">
              Eller skriv inn e-post på nytt
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nytt passord</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Gjenta passord</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                required
              />
            </div>

            {message && <p className="text-sm text-center text-[--deep-sea]">{message}</p>}

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Oppdaterer...' : 'Oppdater passord'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
