import React, { useState } from 'react';

interface PtCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
  hoverable?: boolean;
  padding?: number | string;
}

export function PtCard({ children, style, onClick, hoverable = false, padding = 20 }: PtCardProps) {
  const [hov, setHov] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--pt-surface-1)',
        border: '1px solid var(--pt-border)',
        borderRadius: 'var(--pt-radius-lg)',
        padding,
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
        cursor: onClick ? 'pointer' : 'default',
        ...(hoverable && hov
          ? { borderColor: 'var(--pt-accent-dim)', boxShadow: '0 0 0 1px var(--pt-accent-dim)', transform: 'translateY(-1px)' }
          : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
