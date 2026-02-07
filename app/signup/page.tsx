'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const JUDGE_LEVELS = ['DDA', 'DD1', 'DD2', 'DD3', 'DD4', 'FEI'];

const RIDER_DISTRICTS = [
  { value: '', label: 'Velg rytterkrets' },
  { value: 'Agder Rytterkrets', label: 'Agder Rytterkrets' },
  { value: 'Buskerud Rytterkrets', label: 'Buskerud Rytterkrets' },
  { value: 'Finnmark Rytterkrets', label: 'Finnmark Rytterkrets' },
  { value: 'Hedmark Rytterkrets', label: 'Hedmark Rytterkrets' },
  { value: 'Hordaland Rytterkrets', label: 'Hordaland Rytterkrets' },
  { value: 'Møre og Romsdal Rytterkrets', label: 'Møre og Romsdal Rytterkrets' },
  { value: 'Nordland Rytterkrets', label: 'Nordland Rytterkrets' },
  { value: 'Oppland Rytterkrets', label: 'Oppland Rytterkrets' },
  { value: 'Oslo og Akershus Rytterkrets', label: 'Oslo og Akershus Rytterkrets' },
  { value: 'Rogaland Rytterkrets', label: 'Rogaland Rytterkrets' },
  { value: 'Sogn og Fjordane Rytterkrets', label: 'Sogn og Fjordane Rytterkrets' },
  { value: 'Telemark og Vestfold Rytterregion', label: 'Telemark og Vestfold Rytterregion' },
  { value: 'Troms Rytterkrets', label: 'Troms Rytterkrets' },
  { value: 'Trøndelag Rytterkrets', label: 'Trøndelag Rytterkrets' },
  { value: 'Østfold Rytterkrets', label: 'Østfold Rytterkrets' },
];

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [birthday, setBirthday] = useState('');
  const [judgeLevel, setJudgeLevel] = useState('');
  const [judgeStart, setJudgeStart] = useState('');
  const [riderDistrict, setRiderDistrict] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          birthday: birthday || null,
          judge_level: judgeLevel || null,
          judge_start: judgeStart || null,
          rider_district: riderDistrict || null,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(json?.error || 'Kunne ikke opprette bruker.');
        setLoading(false);
        return;
      }

      setLoading(false);
      router.push('/login');
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Ukjent feil');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--color-background] px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-semibold text-[--deep-sea] mb-6 text-center">
          Lag ny brukerkonto
        </h1>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="label">Fullt navn</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">E-post</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Passord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Fødselsdato</label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Dommernivå</label>
            <select
              value={judgeLevel}
              onChange={(e) => setJudgeLevel(e.target.value)}
              className="input"
            >
              <option value="">Velg dommernivå</option>
              {JUDGE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Startet som dommer</label>
            <input
              type="date"
              value={judgeStart}
              onChange={(e) => setJudgeStart(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Rytterkrets</label>
            <select
              value={riderDistrict}
              onChange={(e) => setRiderDistrict(e.target.value)}
              className="input"
            >
              {RIDER_DISTRICTS.map((d) => (
                <option key={d.value || 'empty'} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Oppretter...' : 'Registrer'}
          </button>
        </form>

        <p className="text-muted text-center mt-6">
          Har du allerede konto?{' '}
          <a href="/login" className="text-[--deep-sea] font-medium hover:underline">
            Logg inn her
          </a>
        </p>
      </div>
    </div>
  );
}
