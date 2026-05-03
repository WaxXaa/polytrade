import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const variantStyles: Record<string, React.CSSProperties> = {
  default:     { background: 'var(--pt-accent)', color: '#fff', border: 'none' },
  destructive: { background: 'var(--pt-red)', color: '#fff', border: 'none' },
  outline:     { background: 'transparent', color: 'var(--pt-text-1)', border: '1px solid var(--pt-border)' },
  secondary:   { background: 'var(--pt-surface-2)', color: 'var(--pt-text-1)', border: 'none' },
  ghost:       { background: 'transparent', color: 'var(--pt-text-2)', border: 'none' },
  link:        { background: 'transparent', color: 'var(--pt-accent)', border: 'none' },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  default: { height: 40, padding: '0 16px', fontSize: 14 },
  sm:      { height: 32, padding: '0 12px', fontSize: 13 },
  lg:      { height: 44, padding: '0 24px', fontSize: 16 },
  icon:    { height: 40, width: 40, padding: 0 },
};

export function Button({
  variant = 'default',
  size = 'default',
  className = '',
  style,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={className}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 8,
        fontFamily: 'var(--pt-font)',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
