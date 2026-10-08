import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
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
  themeColor: '#070a10',
};

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="min-h-screen bg-[#070a10] text-slate-100 antialiased">
        <a href="#main-content" className="skip-link">Skip to tournament content</a>
        <TournamentProvider>
          <div className="site-shell">
            <Navbar />
            <main id="main-content" className="relative z-10 mx-auto w-full max-w-[90rem] flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
              <BattlesDashboardHeader />
              {children}
            </main>
            <Footer />
          </div>
        </TournamentProvider>
      </body>
    </html>
  );
}
