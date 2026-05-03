import React, { useState } from 'react';
import { Icon } from './ui/Icon';
import { PtCard } from './ui/PtCard';
import { Toggle } from './ui/Toggle';
import { useAppStore } from '@/stores';

interface SettingsPanelProps {
  agentActive: boolean;
  setAgentActive: (v: boolean) => void;
  autoExecute: boolean;
  setAutoExecute: (v: boolean) => void;
}

export function SettingsPanel({ agentActive, setAgentActive, autoExecute, setAutoExecute }: SettingsPanelProps) {
  const { riskConfig, setRiskConfig } = useAppStore();
  const [local, setLocal] = useState(riskConfig);

  const handleSave = () => setRiskConfig(local);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--pt-border)', background: 'var(--pt-surface-2)',
    color: 'var(--pt-text-1)', fontSize: 14, fontFamily: 'var(--pt-mono)', outline: 'none',
  };

  return (
    <div className="pt-fade-up" style={{ maxWidth: 700, margin: '0 auto', width: '100%' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Settings</h2>

      {/* Agent controls */}
      <PtCard style={{ padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Agent Controls</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Toggle
            label="Agent Active"
            subtitle="Enable or disable the copy trading agent"
            value={agentActive}
            onChange={setAgentActive}
          />
          <Toggle
            label="Auto Execute"
            subtitle="Automatically copy trades from followed traders"
            value={autoExecute}
            onChange={setAutoExecute}
          />
        </div>
      </PtCard>

      {/* Risk management */}
      <PtCard style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Icon name="shield" size={18} />
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Risk Management</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {([
            { label: 'Max Risk / Trade (%)', key: 'maxRiskPerTrade' as const, factor: 100, min: 1, max: 50 },
            { label: 'Stop Loss (%)',        key: 'stopLossPercent' as const,  factor: 100, min: 5, max: 50 },
            { label: 'Max Trades / Day',    key: 'maxTradesPerDay' as const,  factor: 1,   min: 1, max: 100 },
            { label: 'Min Position ($)',    key: 'minPositionSize' as const,  factor: 1,   min: 1, max: 1000 },
          ] as const).map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--pt-text-3)', marginBottom: 6, fontWeight: 500 }}>
                {f.label}
              </label>
              <input
                type="number"
                value={local[f.key] * f.factor}
                onChange={e => setLocal({ ...local, [f.key]: parseFloat(e.target.value) / f.factor })}
                min={f.min}
                max={f.max}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <Toggle
            label="Trailing Stop"
            subtitle="Move stop loss as price moves in your favour"
            value={local.trailingStop}
            onChange={v => setLocal({ ...local, trailingStop: v })}
          />
        </div>
      </PtCard>

      <button
        onClick={handleSave}
        style={{
          width: '100%', padding: 12, borderRadius: 10, border: 'none',
          background: 'var(--pt-accent)', color: '#fff',
          fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--pt-font)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <Icon name="save" size={16} /> Save Settings
      </button>
    </div>
  );
}
