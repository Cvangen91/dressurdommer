'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);

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

  // Lukk mobilmeny ved klikk utenfor + Escape
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!mobileOpen) return;

      const target = e.target as Node;

      if (toggleBtnRef.current?.contains(target)) return;

      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMobileOpen(false);
    router.push('/');
  };

  // Menyknapper
  const menuButtonClass = 'btn btn-primary text-sm px-4 py-2';
  const logoutButtonClass = 'btn btn-secondary text-sm px-4 py-2';

  return (
    <header className="bg-[--night-sky] text-[--white] shadow-md">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4 md:py-6">
        <Link href="/" className="flex items-center" onClick={() => setMobileOpen(false)}>
          <div className="relative w-[280px] sm:w-[320px] md:w-[400px] h-12 md:h-20">
            <Image
              src="/img/logo.png"
              alt="Dressurdommer.no logo"
              fill
              priority
              sizes="(max-width: 640px) 280px, (max-width: 768px) 320px, 400px"
              className="object-contain"
            />
          </div>
        </Link>

        {/* Desktop meny */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/contact" className={menuButtonClass}>
            Kontakt
          </Link>

          {user ? (
            <>
              <Link href="/profile" className={menuButtonClass}>
                Profil
              </Link>
              <button onClick={handleLogout} className={logoutButtonClass}>
                Logg ut
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={menuButtonClass}>
                Logg inn
              </Link>
              <Link href="/signup" className={menuButtonClass}>
                Opprett konto
              </Link>
            </>
          )}
        </div>

        {/* Mobil hamburger */}
        <button
          ref={toggleBtnRef}
          type="button"
          aria-label={mobileOpen ? 'Lukk meny' : 'Åpne meny'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-white/10 transition"
        >
          {mobileOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-7 h-7"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-7 h-7"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobilmeny */}
      {mobileOpen && (
        <div ref={mobileMenuRef} className="md:hidden border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex flex-col items-center gap-3">
              <Link
                href="/contact"
                onClick={() => setMobileOpen(false)}
                className={`${menuButtonClass} w-48 text-center`}
              >
                Kontakt
              </Link>

              {user ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className={`${menuButtonClass} w-48 text-center`}
                  >
                    Profil
                  </Link>
                  <button
                    onClick={handleLogout}
                    className={`${logoutButtonClass} w-48 text-center`}
                  >
                    Logg ut
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className={`${menuButtonClass} w-48 text-center`}
                  >
                    Logg inn
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className={`${menuButtonClass} w-48 text-center`}
                  >
                    Opprett konto
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
