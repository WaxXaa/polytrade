interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  subtitle?: string;
}

export function Toggle({ value, onChange, label, subtitle }: ToggleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        {label && <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--pt-text-1)' }}>{label}</div>}
        {subtitle && <div style={{ fontSize: 11, color: 'var(--pt-text-3)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 40, height: 22, borderRadius: 11,
          border: 'none', padding: 2, cursor: 'pointer',
          background: value ? 'var(--pt-accent)' : 'var(--pt-surface-3)',
          transition: 'background 0.2s',
          display: 'flex', alignItems: 'center', flexShrink: 0,
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'transform 0.2s',
          transform: value ? 'translateX(18px)' : 'translateX(0)',
        }} />
      </button>
    </div>
  );
}
