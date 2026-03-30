'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import type { User } from '@supabase/supabase-js';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);

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
      <section className="bg-[--deep-sea] text-white py-10 md:py-24 px-4 md:px-12">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 items-center gap-3 sm:gap-4 md:gap-10">
          {/* Tekst */}
          <div className="space-y-4 md:space-y-6">
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-snug md:leading-tight">
              Gjør dommerarbeidet enklere, ryddigere og mer moderne.
            </h1>
            <p className="text-base sm:text-lg text-[--warm-sand-light] max-w-lg">
              Med digitale dommermøterapporter og personlig profil får du bedre oversikt og enklere
              samarbeid mellom dommere.
            </p>

            {!user && (
              <div className="flex flex-col sm:flex-row gap-3 pt-2 md:pt-4">
                <Link
                  href="/signup"
                  className="btn btn-primary text-base px-6 py-3 w-full sm:w-auto"
                >
                  Opprett konto
                </Link>
                <Link
                  href="/login"
                  className="btn btn-secondary text-base px-6 py-3 w-full sm:w-auto"
                >
                  Logg inn
                </Link>
              </div>
            )}
          </div>

          {/* Bilde */}
          <div className="rounded-[--radius-lg] bg-[--night-sky] shadow-lg overflow-hidden">
            <div className="aspect-[3/2] w-full">
              <Image
                src="/img/frontpage.jpg"
                alt="Dressurdommer illustrasjon"
                width={1500}
                height={1000}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-10 md:py-20 px-4 md:px-12">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white text-center leading-snug">
            Alt samlet for deg som dommer
          </h2>

          <div className="grid gap-4 md:grid-cols-3 md:gap-8">
            <div className="card p-5 md:p-6">
              <h3 className="text-lg md:text-xl font-semibold text-[--deep-sea] mb-2">
                Dommerprofil
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Bygg en komplett profil med dommernivå, erfaring og rytterkrets. Alt samlet og lett
                tilgjengelig.
              </p>
            </div>

            <div className="card p-5 md:p-6">
              <h3 className="text-lg md:text-xl font-semibold text-[--deep-sea] mb-2">
                Dommermøterapporter
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Fyll ut rapporter digitalt, lagre dem og del dem med de andre dommerne på stevnet.
              </p>
            </div>

            <div className="card p-5 md:p-6">
              <h3 className="text-lg md:text-xl font-semibold text-[--deep-sea] mb-2">
                Videre utvikling
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Vi bygger kurs, forum og læringsplattform – slik at du som dommer alltid kan utvikle
                deg videre.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* NEWS SECTION */}
      <section className="py-8 md:py-12 px-4 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="card p-5 md:p-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-[--deep-sea]">
                Nyeste oppdateringer
              </h2>
              <span className="text-xs sm:text-sm text-gray-500">Oppdatert: 30.03.2026</span>
            </div>

            <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
              Større oppdatering på utfylling av dommermøterapporter basert på tilbakemeldinger fra
              bruker er gjennomført. I tillegg er det laget funksjon for å resette passord.
            </p>

            <ul className="list-disc pl-5 text-gray-700 text-sm sm:text-base space-y-1">
              <li>
                Endret fra dommer 1,2,3 til Plassering til dommeren og mulighet for å legge til
                opptil 5 dommere
              </li>
              <li>
                Ved lagring kan man nå velge å legge til ny ekvipasje fra samme klasse og starte med
                en del felter utfylt
              </li>
              <li>Plassering i klassen og antall starter i klassen er lagt til som informasjon</li>
              <li>
                På profilsiden vil nå flere rapporter fra samme stevne samles under et stevne, for
                bedre oversikt
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      {!user && (
        <section className="py-10 md:py-20 px-4 md:px-12">
          <div className="max-w-4xl mx-auto card text-center p-6 md:p-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[--deep-sea] mb-3 md:mb-4 leading-snug">
              Klar for å teste Dressurdommer.no?
            </h2>
            <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto mb-6 md:mb-8">
              Opprett en bruker og prøv å fylle ut din første digitale dommermøterapport.
            </p>
            <Link
              href="/signup"
              className="btn btn-primary text-base md:text-lg px-8 py-3 w-full sm:w-auto"
            >
              Opprett konto
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
