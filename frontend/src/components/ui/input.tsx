import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function Input({ className = '', style, ...props }: InputProps) {
  return (
    <input
      className={className}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid var(--pt-border)',
        background: 'var(--pt-surface-2)',
        color: 'var(--pt-text-1)',
        fontSize: 14,
        fontFamily: 'var(--pt-mono)',
        outline: 'none',
        ...style,
      }}
      {...props}
    />
  );
}
