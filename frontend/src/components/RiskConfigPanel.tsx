import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card.js';
import { Button } from './components/ui/button.js';
import { Input } from './components/ui/input.js';
import { Separator } from './components/ui/separator.js';

interface RiskConfig {
  maxExposurePercent: number;
  stopLossPercent: number;
  maxTradesPerHour: number;
  maxPositionPercent: number;
}

const DEFAULTS: RiskConfig = {
  maxExposurePercent: 50,
  stopLossPercent: 15,
  maxTradesPerHour: 20,
  maxPositionPercent: 10,
};

export function RiskConfigPanel() {
  const [config, setConfig] = useState<RiskConfig>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useApi();

  const handleChange = (key: keyof RiskConfig, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) setConfig((prev) => ({ ...prev, [key]: num }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.postConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Configuration</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <ConfigField
            label="Max Exposure %"
            value={config.maxExposurePercent}
            onChange={(v) => handleChange('maxExposurePercent', v)}
          />
          <ConfigField
            label="Stop-Loss %"
            value={config.stopLossPercent}
            onChange={(v) => handleChange('stopLossPercent', v)}
          />
          <ConfigField
            label="Max Trades / Hour"
            value={config.maxTradesPerHour}
            onChange={(v) => handleChange('maxTradesPerHour', v)}
          />
          <ConfigField
            label="Max Position %"
            value={config.maxPositionPercent}
            onChange={(v) => handleChange('maxPositionPercent', v)}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          {error && <span className="text-sm text-destructive">{error}</span>}
          {saved && <span className="text-sm text-green-500">Saved!</span>}
          {!error && !saved && <span />}
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving...' : 'Save Config'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfigField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  );
}
