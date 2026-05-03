import { useWallet } from '../hooks/useWallet';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export function WalletConnector() {
  const {
    connected,
    truncatedAddress,
    usdcBalance,
    isPolygon,
    connecting,
    error,
    connect,
    disconnect,
    switchToPolygon,
  } = useWallet();

  if (!connected) {
    return (
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-destructive">{error}</span>}
        <Button
          size="sm"
          onClick={() => void connect()}
          disabled={connecting}
        >
          {connecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      </div>
    );
  }

  if (!isPolygon) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive">Wrong Network</Badge>
        <Button size="sm" variant="outline" onClick={() => void switchToPolygon()}>
          Switch to Polygon
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-end">
        <span className="text-sm font-mono">{truncatedAddress}</span>
        <span className="text-xs text-muted-foreground">{usdcBalance.toFixed(2)} USDC</span>
      </div>
      <Button size="sm" variant="outline" onClick={disconnect}>
        Disconnect
      </Button>
    </div>
  );
}
