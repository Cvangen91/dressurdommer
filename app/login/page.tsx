'use client';

import { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push('/profile');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--color-background] px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-semibold text-[--deep-sea] mb-6 text-center">Logg inn</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* E-post */}
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

          {/* Passord */}
          <div>
            <label className="label">Passord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Logger inn...' : 'Logg inn'}
          </button>
        </form>

        <p className="text-muted text-center mt-6">
          Har du ikke konto?{' '}
          <a href="/signup" className="text-[--deep-sea] font-medium hover:underline">
            Opprett ny
          </a>
        </p>
      </div>
    </div>
  );
}
