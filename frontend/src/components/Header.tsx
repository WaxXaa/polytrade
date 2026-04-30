import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Settings, Wallet, Loader2 } from 'lucide-react';
import { cn, truncateAddress, formatCurrency } from '@/lib/utils';
import { useAppStore } from '@/stores';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export function Header() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { walletConnected, setWalletConnected, setWalletAddress } = useAppStore();
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  const handleConnect = async () => {
    const connector = connectors.find(c => c.type === 'injected');
    if (connector) {
      try {
        await connect({ connector });
      } catch (error) {
        console.error('Failed to connect:', error);
      }
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setWalletConnected(false);
    setWalletAddress(null);
  };

  // Sync wagmi state to store
  if (address && !walletConnected) {
    setWalletConnected(true);
    setWalletAddress(address);
  }

  return (
    <header className="border-b border-white/10 bg-card/50 backdrop-blur-md sticky top-0 z-50">
      <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-magenta-500 flex items-center justify-center">
              <span className="text-xl font-bold text-black">P</span>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gradient">POLYMARKET AI</h1>
            <p className="text-xs text-muted-foreground">Copy Trading Agent</p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="gap-2 border-cyan-500/50 text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            LIVE
          </Badge>

          {/* Wallet Connection */}
          <div className="relative">
            {isConnected && address ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-green-500/50 text-green-400 hover:bg-green-500/10"
                  onClick={handleDisconnect}
                >
                  <Wallet className="w-4 h-4" />
                  <span className="hidden sm:inline">{truncateAddress(address)}</span>
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wallet className="w-4 h-4" />
                )}
                Connect Wallet
              </Button>
            )}
          </div>

          {/* Settings Button */}
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}