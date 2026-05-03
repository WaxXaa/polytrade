// ── Shared inline style objects for Polytrade UI ──────────────────────────
// Import these in any component to stay consistent without Tailwind.

export const ptSurface = (level: 1 | 2 | 3 = 1): React.CSSProperties => ({
  background: `var(--pt-surface-${level})`,
  border: '1px solid var(--pt-border)',
  borderRadius: 'var(--pt-radius-lg)',
});

export const ptMono: React.CSSProperties = {
  fontFamily: 'var(--pt-mono)',
  letterSpacing: '-0.3px',
};

export const ptText = (level: 1 | 2 | 3 = 1): React.CSSProperties => ({
  color: `var(--pt-text-${level})`,
});
