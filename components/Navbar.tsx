// components/Navbar.tsx
// 'use client' means this runs in the browser — needed because
// we use usePathname() to highlight the active nav link.
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Home' },
  { href: '/players', label: 'Players' },
  { href: '/h2h', label: 'Head-to-Head' },
  { href: '/standings', label: 'Standings' },
  { href: '/schedule', label: 'Schedule' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav style={{
      background: 'var(--navy2)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <Link href="/" style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '20px',
        fontWeight: 700,
        color: '#fff',
        textDecoration: 'none',
        marginRight: '32px',
        letterSpacing: '1px',
      }}>
        ⚾ DIAMOND STATS
      </Link>

      <div style={{ display: 'flex', gap: '4px' }}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            color: pathname === link.href ? '#f5a623' : 'var(--muted)',
            textDecoration: 'none',
            background: pathname === link.href ? 'var(--navy3)' : 'transparent',
          }}>
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
