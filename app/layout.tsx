// app/layout.tsx
// This is the "shell" of your entire app.
// Every page is rendered inside the {children} slot.
// The Navbar appears on every page because it lives here.

import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Diamond Stats | MLB Analytics',
  description: 'Real-time MLB player analytics, standings, and matchups',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}