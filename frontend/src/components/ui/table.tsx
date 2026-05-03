import React from 'react';

interface BaseProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Table({ children, className = '', style }: BaseProps) {
  return <table className={className} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, ...style }}>{children}</table>;
}

export function TableHeader({ children, className = '', style }: BaseProps) {
  return <thead className={className} style={style}>{children}</thead>;
}

export function TableBody({ children, className = '', style }: BaseProps) {
  return <tbody className={className} style={style}>{children}</tbody>;
}

export function TableRow({ children, className = '', style }: BaseProps) {
  return <tr className={className} style={{ borderBottom: '1px solid var(--pt-border)', transition: 'background 0.15s', ...style }}>{children}</tr>;
}

export function TableHead({ children, className = '', style }: BaseProps) {
  return (
    <th
      className={className}
      style={{
        padding: '12px 16px',
        textAlign: 'left',
        fontSize: 11,
        color: 'var(--pt-text-3)',
        fontWeight: 600,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', style }: BaseProps) {
  return <td className={className} style={{ padding: '12px 16px', ...style }}>{children}</td>;
}
