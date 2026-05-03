import React from 'react';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default:     { background: 'oklch(0.45 0.12 155 / 0.15)', color: 'var(--pt-green)',  border: '1px solid var(--pt-green)' },
  secondary:   { background: 'var(--pt-surface-2)',           color: 'var(--pt-text-2)', border: '1px solid var(--pt-border)' },
  destructive: { background: 'oklch(0.55 0.18 15 / 0.15)',   color: 'var(--pt-red)',   border: '1px solid var(--pt-red)' },
  outline:     { background: 'transparent',                    color: 'var(--pt-text-2)', border: '1px solid var(--pt-border)' },
};

export function Badge({ children, variant = 'default', className = '', style }: BadgeProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
