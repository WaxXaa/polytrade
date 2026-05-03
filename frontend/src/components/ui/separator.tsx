interface SeparatorProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ className = '', orientation = 'horizontal' }: SeparatorProps) {
  return (
    <div
      className={className}
      style={{
        width: orientation === 'vertical' ? 1 : '100%',
        height: orientation === 'vertical' ? '100%' : 1,
        background: 'var(--pt-border)',
      }}
    />
  );
}
