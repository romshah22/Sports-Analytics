'use client';

import { useState } from 'react';
import { getStatInfo } from '@/lib/stat-definitions';

interface StatTooltipProps {
  label: string;
  value: any;
  showSimple?: boolean;
}

export default function StatTooltip({ label, value, showSimple = true }: StatTooltipProps) {
  const [hovering, setHovering] = useState(false);
  const info = getStatInfo(label);

  return (
    <div style={{ position: 'relative' }}>
      <div
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{
          background: 'var(--navy3)', borderRadius: '8px',
          padding: '12px', textAlign: 'center', cursor: 'help',
          position: 'relative', zIndex: 1,
        }}
      >
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '22px', fontWeight: 700, color: '#fff',
        }}>
          {value}
        </div>
        <div style={{
          fontSize: '10px', color: 'var(--muted)', marginTop: '4px',
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          {label}
        </div>
      </div>

      {/* Tooltip */}
      {hovering && info && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--navy3)', border: '1px solid var(--accent2)',
          borderRadius: '8px', padding: '12px 14px',
          marginBottom: '8px', zIndex: 1000,
          minWidth: '220px', maxWidth: '280px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            fontSize: '12px', fontWeight: 600, color: 'var(--accent2)',
            marginBottom: '6px',
          }}>
            {info.label}
          </div>
          <div style={{
            fontSize: '11px', color: 'var(--text)', lineHeight: 1.5,
            marginBottom: '8px',
          }}>
            {info.description}
          </div>
          {showSimple && (
            <div style={{
              fontSize: '10px', color: 'var(--accent2)',
              fontWeight: 600, fontStyle: 'italic',
              paddingTop: '8px', borderTop: '1px solid var(--navy2)',
            }}>
              💡 {info.simple}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
