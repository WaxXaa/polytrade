import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className = '', style }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--pt-surface-1)',
        border: '1px solid var(--pt-border)',
        borderRadius: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', style }: CardProps) {
  return (
    <div
      className={className}
      style={{
        padding: '20px 20px 0 20px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', style }: CardProps) {
  return (
    <h3
      className={className}
      style={{
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--pt-text-1)',
        margin: 0,
        ...style,
      }}
    >
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '', style }: CardProps) {
  return (
    <div
      className={className}
      style={{
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
