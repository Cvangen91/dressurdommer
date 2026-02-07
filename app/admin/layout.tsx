'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, approval_status')
        .eq('id', user.id)
        .single();

      const ok = profile?.role === 'admin' && profile?.approval_status === 'approved';

      if (!ok) {
        router.replace('/profile');
        return;
      }

      setChecking(false);
    };

    run();
  }, [router]);

  if (checking) {
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
          {/* Admin-sider kan fortsatt bruke card/sections inni */}
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
