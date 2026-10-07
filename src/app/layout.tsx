import type { Metadata, Viewport } from 'next';
import './globals.css';
import { TournamentProvider } from '@/context/TournamentContext';
import Navbar from '@/components/Navbar';
import BattlesDashboardHeader from '@/components/BattlesDashboardHeader';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Robot Games Tournament | Live Championship Bracket & Results',
  description: 'Official university Robot Games tournament bracket, live matches, wildcard rounds, and championship results for Heavyweight and Lightweight divisions.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen flex flex-col antialiased">
        <TournamentProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <BattlesDashboardHeader />
            {children}
          </main>
          <Footer />
        </TournamentProvider>
      </body>
    </html>
  );
}
