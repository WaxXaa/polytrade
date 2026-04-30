/**
 * NotificationToast — shows real-time trade execution and risk alert toasts.
 * Listens to the agent context and auto-dismisses after 5 seconds.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAgent } from '../context/AgentContext.js';
import type { RiskAlert, TradeHistoryItem } from '../types/ws-events.js';
import styles from './NotificationToast.module.css';

interface Toast {
  id: string;
  kind: 'trade' | 'risk';
  trade?: TradeHistoryItem;
  alert?: RiskAlert;
}

export function NotificationToast() {
  const { tradeHistory, riskAlerts } = useAgent();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [seenTrades, setSeenTrades] = useState<Set<string>>(new Set());
  const [seenAlerts, setSeenAlerts] = useState<number>(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // New trade
  useEffect(() => {
    if (tradeHistory.length === 0) return;
    const latest = tradeHistory[0]!;
    if (seenTrades.has(latest.id)) return;

    setSeenTrades((prev) => new Set([...prev, latest.id]));
    const toast: Toast = { id: `trade-${latest.id}`, kind: 'trade', trade: latest };
    setToasts((prev) => [toast, ...prev].slice(0, 5));

    const timer = setTimeout(() => dismiss(toast.id), 3_000);
    return () => clearTimeout(timer);
  }, [tradeHistory, seenTrades, dismiss]);

  // New risk alert
  useEffect(() => {
    if (riskAlerts.length <= seenAlerts) return;
    const newAlerts = riskAlerts.slice(0, riskAlerts.length - seenAlerts);
    setSeenAlerts(riskAlerts.length);

    for (const alert of newAlerts) {
      const id = `alert-${Date.now()}-${Math.random()}`;
      const toast: Toast = { id, kind: 'risk', alert };
      setToasts((prev) => [toast, ...prev].slice(0, 5));
      const timer = setTimeout(() => dismiss(id), 3_000);
      // cleanup handled by component unmount
      void timer;
    }
  }, [riskAlerts, seenAlerts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${toast.kind === 'risk' ? styles.risk : styles.trade} animate-fade-in`}
        >
          <button className={styles.close} onClick={() => dismiss(toast.id)}>×</button>
          {toast.kind === 'trade' && toast.trade && (
            <>
              <div className={styles.header}>
                <span className={toast.trade.direction === 'BUY' ? 'badge badge-success' : 'badge badge-danger'}>
                  {toast.trade.direction}
                </span>
                <span className={styles.amount}>{toast.trade.amount.toFixed(2)} USDC</span>
              </div>
              <div className={styles.body}>
                <span className="text-muted">{toast.trade.market.slice(0, 24)}...</span>
                <span className="text-secondary">via {toast.trade.topTraderName}</span>
              </div>
            </>
          )}
          {toast.kind === 'risk' && toast.alert && (
            <>
              <div className={styles.header}>
                <span className={toast.alert.severity === 'critical' ? 'badge badge-danger' : 'badge badge-warning'}>
                  {toast.alert.severity.toUpperCase()}
                </span>
                <span className={styles.alertType}>{toast.alert.type.replace(/-/g, ' ')}</span>
              </div>
              <div className={styles.body}>
                <span>{toast.alert.message}</span>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
