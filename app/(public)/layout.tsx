import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[--color-background] text-[--color-text]">
      <Navbar />
      <main className="bg-transparent">{children}</main>
      <Footer />
    </div>
  );
}
