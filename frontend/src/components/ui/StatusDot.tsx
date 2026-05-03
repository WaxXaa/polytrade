interface StatusDotProps {
  status?: 'live' | 'pending' | 'off';
  size?: number;
}

export function StatusDot({ status = 'live', size = 8 }: StatusDotProps) {
  const colors = {
    live:    'var(--pt-green)',
    pending: 'var(--pt-yellow)',
    off:     'var(--pt-text-3)',
  };
  return (
    <span style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      background: colors[status],
      boxShadow: status === 'live' ? `0 0 6px var(--pt-green)` : 'none',
      animation: status === 'live' ? 'pt-pulse-dot 2s ease-in-out infinite' : 'none',
      flexShrink: 0,
    }} />
  );
}
