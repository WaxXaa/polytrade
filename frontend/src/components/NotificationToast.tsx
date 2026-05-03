import { useState, useEffect, useCallback } from 'react';
import { useAgent } from '../context/AgentContext';
import type { RiskAlert, TradeHistoryItem } from '../types/ws-events';

interface Toast {
  id: string;
  kind: 'trade' | 'risk';
  trade?: TradeHistoryItem;
  alert?: RiskAlert;
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 20,
  right: 20,
  zIndex: 200,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  maxWidth: 360,
};

function toastBase(color: string, bg: string): React.CSSProperties {
  return {
    background: bg,
    border: `1px solid ${color}`,
    borderRadius: 12,
    padding: '12px 16px',
    position: 'relative',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    animation: 'pt-slide-in 0.3s ease',
  };
}

const tradeToastStyle = toastBase('var(--pt-green)', 'var(--pt-surface-1)');
const riskToastStyle = toastBase('var(--pt-red)', 'var(--pt-surface-1)');
const riskCriticalStyle = toastBase('var(--pt-yellow)', 'oklch(0.2 0.02 15)');

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: 6,
  right: 10,
  background: 'none',
  border: 'none',
  color: 'var(--pt-text-3)',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 4,
};

export function NotificationToast() {
  const { tradeHistory, riskAlerts } = useAgent();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [seenTrades, setSeenTrades] = useState<Set<string>>(new Set());
  const [seenAlerts, setSeenAlerts] = useState(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (tradeHistory.length === 0) return;
    const latest = tradeHistory[0]!;
    if (seenTrades.has(latest.id)) return;

    setSeenTrades((prev) => new Set([...prev, latest.id]));
    const toast: Toast = { id: `trade-${latest.id}`, kind: 'trade', trade: latest };
    setToasts((prev) => [toast, ...prev].slice(0, 5));

    const timer = setTimeout(() => dismiss(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [tradeHistory, seenTrades, dismiss]);

  useEffect(() => {
    if (riskAlerts.length <= seenAlerts) return;
    const newAlerts = riskAlerts.slice(seenAlerts);
    setSeenAlerts(riskAlerts.length);

    for (const alert of newAlerts) {
      const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const toast: Toast = { id, kind: 'risk', alert };
      setToasts((prev) => [toast, ...prev].slice(0, 5));
      setTimeout(() => dismiss(id), 3000);
    }
  }, [riskAlerts, seenAlerts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div style={containerStyle}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={
            toast.kind === 'risk'
              ? (toast.alert?.severity === 'critical' ? riskCriticalStyle : riskToastStyle)
              : tradeToastStyle
          }
        >
          <button style={closeBtnStyle} onClick={() => dismiss(toast.id)}>×</button>
          {toast.kind === 'trade' && toast.trade && (
            <>
              <div style={headerStyle}>
                <span style={{
                  display: 'inline-flex',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: toast.trade.direction === 'BUY'
                    ? 'oklch(0.45 0.12 155 / 0.15)'
                    : 'oklch(0.55 0.18 15 / 0.15)',
                  color: toast.trade.direction === 'BUY' ? 'var(--pt-green)' : 'var(--pt-red)',
                }}>
                  {toast.trade.direction}
                </span>
                <span style={{ fontFamily: 'var(--pt-mono)', fontSize: 13, fontWeight: 600, color: 'var(--pt-text-1)' }}>
                  {toast.trade.amount.toFixed(2)} USDC
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--pt-text-3)' }}>
                <span>{toast.trade.market.slice(0, 24)}{toast.trade.market.length > 24 && '...'}</span>
                <span style={{ marginLeft: 8, color: 'var(--pt-accent)' }}>via {toast.trade.topTraderName}</span>
              </div>
            </>
          )}
          {toast.kind === 'risk' && toast.alert && (
            <>
              <div style={headerStyle}>
                <span style={{
                  display: 'inline-flex',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: toast.alert.severity === 'critical'
                    ? 'oklch(0.55 0.18 15 / 0.15)'
                    : 'oklch(0.7 0.14 80 / 0.15)',
                  color: toast.alert.severity === 'critical' ? 'var(--pt-red)' : 'var(--pt-yellow)',
                }}>
                  {toast.alert.severity.toUpperCase()}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--pt-text-1)' }}>
                  {toast.alert.type.replace(/-/g, ' ')}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--pt-text-2)' }}>
                {toast.alert.message}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
