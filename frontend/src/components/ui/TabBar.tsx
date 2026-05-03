import React from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  style?: React.CSSProperties;
}

export function TabBar({ tabs, active, onChange, style }: TabBarProps) {
  return (
    <div style={{
      display: 'flex',
      gap: 2,
      background: 'var(--pt-surface-2)',
      borderRadius: 8,
      padding: 3,
      ...style,
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'var(--pt-font)',
            background: active === t.id ? 'var(--pt-surface-1)' : 'transparent',
            color: active === t.id ? 'var(--pt-text-1)' : 'var(--pt-text-3)',
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: active === t.id ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
