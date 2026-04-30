import { useState } from 'react';
import { useAppStore } from '@/stores';
import { Settings, Save } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export function SettingsPanel() {
  const { riskConfig, setRiskConfig, autoExecute, setAutoExecute } = useAppStore();
  const [localConfig, setLocalConfig] = useState(riskConfig);

  const handleSave = () => {
    setRiskConfig(localConfig);
  };

  return (
    <div className="cyber-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          SETTINGS
        </h2>
      </div>

      {/* Auto Execute Toggle */}
      <div className="mb-6 p-3 rounded-lg bg-card/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Auto Execute</div>
            <div className="text-xs text-muted-foreground">
              Automatically copy trades
            </div>
          </div>
          <button
            onClick={() => setAutoExecute(!autoExecute)}
            className={cn(
              "w-12 h-6 rounded-full transition-colors",
              autoExecute ? "bg-cyan-500" : "bg-gray-600"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full bg-white transition-transform",
              autoExecute ? "translate-x-6" : "translate-x-0.5"
            )} />
          </button>
        </div>
      </div>

      {/* Risk Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Risk Management</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Max Risk/Trade %
            </label>
            <input
              type="number"
              value={localConfig.maxRiskPerTrade * 100}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                maxRiskPerTrade: parseFloat(e.target.value) / 100
              })}
              className="w-full bg-card border border-white/10 rounded px-3 py-2 text-sm"
              min="1"
              max="50"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Stop Loss %
            </label>
            <input
              type="number"
              value={localConfig.stopLossPercent * 100}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                stopLossPercent: parseFloat(e.target.value) / 100
              })}
              className="w-full bg-card border border-white/10 rounded px-3 py-2 text-sm"
              min="5"
              max="50"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Max Trades/Day
            </label>
            <input
              type="number"
              value={localConfig.maxTradesPerDay}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                maxTradesPerDay: parseInt(e.target.value)
              })}
              className="w-full bg-card border border-white/10 rounded px-3 py-2 text-sm"
              min="1"
              max="100"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Min Position ($)
            </label>
            <input
              type="number"
              value={localConfig.minPositionSize}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                minPositionSize: parseFloat(e.target.value)
              })}
              className="w-full bg-card border border-white/10 rounded px-3 py-2 text-sm"
              min="1"
            />
          </div>
        </div>

        {/* Trailing Stop */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-card/50">
          <div>
            <div className="font-medium">Trailing Stop</div>
            <div className="text-xs text-muted-foreground">
              Move stop loss as price moves
            </div>
          </div>
          <button
            onClick={() => setLocalConfig({
              ...localConfig,
              trailingStop: !localConfig.trailingStop
            })}
            className={cn(
              "w-12 h-6 rounded-full transition-colors",
              localConfig.trailingStop ? "bg-cyan-500" : "bg-gray-600"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full bg-white transition-transform",
              localConfig.trailingStop ? "translate-x-6" : "translate-x-0.5"
            )} />
          </button>
        </div>

        <Button
          onClick={handleSave}
          className="w-full gap-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30"
        >
          <Save className="w-4 h-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}