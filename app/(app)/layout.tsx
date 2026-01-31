'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      setCheckingAuth(false);
    };

    checkAuth();
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted">
        Sjekker tilgang…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--color-background] text-[--color-text]">
      <Navbar />

      <main className="py-10 px-4">
        <div className="bg-[--color-surface] mx-auto max-w-6xl rounded-xl shadow-soft px-6 py-8">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
