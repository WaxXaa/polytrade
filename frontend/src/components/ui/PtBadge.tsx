import React from 'react';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'buy' | 'sell';

interface PtBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
}

const VARIANT_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  default: { background: 'var(--pt-surface-2)', color: 'var(--pt-text-2)' },
  success: { background: 'oklch(0.45 0.12 155 / 0.15)', color: 'var(--pt-green)',  border: '1px solid oklch(0.45 0.12 155 / 0.25)' },
  danger:  { background: 'oklch(0.55 0.18 15  / 0.15)', color: 'var(--pt-red)',    border: '1px solid oklch(0.55 0.18 15  / 0.25)' },
  warning: { background: 'oklch(0.7  0.14 80  / 0.15)', color: 'var(--pt-yellow)', border: '1px solid oklch(0.7  0.14 80  / 0.25)' },
  info:    { background: 'oklch(0.6  0.12 230 / 0.15)', color: 'var(--pt-accent)', border: '1px solid oklch(0.6  0.12 230 / 0.25)' },
  buy:     { background: 'oklch(0.45 0.12 155 / 0.2)',  color: 'var(--pt-green)' },
  sell:    { background: 'oklch(0.55 0.18 15  / 0.2)',  color: 'var(--pt-red)' },
};

export function PtBadge({ children, variant = 'default', style }: PtBadgeProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.3px',
      whiteSpace: 'nowrap',
      ...VARIANT_STYLES[variant],
      ...style,
    }}>
      {children}
    </span>
  );
}
