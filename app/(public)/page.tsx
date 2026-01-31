'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="bg-[--color-background] min-h-screen text-[--color-text]">
      {/* HERO SECTION */}
      <section className="bg-[--deep-sea] text-white py-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 items-center gap-10">
          {/* Tekst */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Gjør dommerarbeidet enklere, ryddigere og mer moderne.
            </h1>
            <p className="text-lg text-[--warm-sand-light] max-w-lg">
              Med digitale dommermøterapporter og personlig profil får du bedre oversikt og enklere
              samarbeid mellom dommere.
            </p>

            {!user && (
              <div className="flex flex-wrap gap-4 pt-4">
                <Link href="/signup" className="btn btn-primary text-base px-6 py-3">
                  Opprett konto
                </Link>
                <Link href="/login" className="btn btn-secondary text-base px-6 py-3">
                  Logg inn
                </Link>
              </div>
            )}
          </div>

          {/* Bildeplassholder */}

          <div className="rounded-[--radius-lg] bg-[--night-sky] h-64 md:h-80 shadow-lg flex items-center justify-center overflow-hidden">
            <Image
              src="/img/frontpage.jpg"
              alt="Dressurdommer illustrasjon"
              width={400}
              height={400}
              className="object-cover w-full h-full"
            />
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto space-y-12">
          <h2 className="text-3xl font-semibold text-white text-center">
            Alt samlet for deg som dommer
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="card">
              <h3 className="text-xl font-semibold text-[--deep-sea] mb-2">Dommerprofil</h3>
              <p className="text-gray-600 text-sm">
                Bygg en komplett profil med dommernivå, erfaring og rytterkrets. Alt samlet og lett
                tilgjengelig.
              </p>
            </div>

            <div className="card">
              <h3 className="text-xl font-semibold text-[--deep-sea] mb-2">Dommermøterapporter</h3>
              <p className="text-gray-600 text-sm">
                Fyll ut rapporter digitalt, lagre dem og del dem med de andre dommerne på stevnet.
              </p>
            </div>

            <div className="card">
              <h3 className="text-xl font-semibold text-[--deep-sea] mb-2">Videre utvikling</h3>
              <p className="text-gray-600 text-sm">
                Vi bygger kurs, forum og læringsplattform – slik at du som dommer alltid kan utvikle
                deg videre.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      {!user && (
        <section className="py-20 px-6 md:px-12">
          <div className="max-w-4xl mx-auto card text-center">
            <h2 className="text-3xl font-semibold text-[--deep-sea] mb-4">
              Klar for å teste Dressurdommer.no?
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto mb-8">
              Opprett en bruker og prøv å fylle ut din første digitale dommermøterapport.
            </p>
            <Link href="/signup" className="btn btn-primary text-lg px-8 py-3">
              Opprett konto
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
