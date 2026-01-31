'use client';

import { FaFacebook, FaInstagram } from 'react-icons/fa';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[--night-sky] text-[--white] py-8 mt-16">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Venstre del – kontaktinfo */}
        <div className="text-center md:text-left space-y-1 text-sm">
          <p className="font-semibold text-[--warm-sand]">Dressurdommer.no</p>
          <p>
            Kontakt:{' '}
            <a href="mailto:post@dressurdommer.no" className="underline hover:text-[--warm-sand]">
              post@dressurdommer.no
            </a>
          </p>
        </div>

        {/* Midtre del – copyright */}
        <div className="text-center text-xs text-gray-300">
          <p>© {new Date().getFullYear()} Dressurdommer.no. Alle rettigheter reservert.</p>
        </div>

        {/* Høyre del – sosiale medier */}
        <div className="flex justify-center md:justify-end gap-4">
          <Link
            href="https://www.facebook.com/profile.php?id=61584361103656"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[--warm-sand] transition-colors"
          >
            <FaFacebook size={22} />
          </Link>

          <Link
            href="https://www.instagram.com/dressurdommer.no/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[--warm-sand] transition-colors"
          >
            <FaInstagram size={22} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
