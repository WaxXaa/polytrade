import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { useAppStore } from '@/stores';
import { truncateAddress } from '@/lib/utils';
import { useCallback, useMemo } from 'react';

export function useWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync, connectors, isPending: connecting, error: connectError } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const storeWallet = useAppStore((s) => s.walletConnected);
  const storeAddress = useAppStore((s) => s.walletAddress);

  const connected = storeWallet || isConnected;
  const displayAddress = address || storeAddress || '';

  const truncatedAddress = useMemo(() => {
    if (!displayAddress) return '';
    return truncateAddress(displayAddress);
  }, [displayAddress]);

  const isPolygon = chainId === polygon.id;

  const connect = useCallback(async () => {
    if (connectors.length === 0) return;
    try {
      await connectAsync({ connector: connectors[0]! });
    } catch {
      // user rejected
    }
  }, [connectAsync, connectors]);

  const disconnect = useCallback(async () => {
    try {
      await disconnectAsync();
    } catch {
      // ignore
    }
  }, [disconnectAsync]);

  const switchToPolygon = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: polygon.id });
    } catch {
      // ignore
    }
  }, [switchChainAsync]);

  return {
    connected,
    truncatedAddress,
    usdcBalance: 0,
    isPolygon,
    connecting,
    error: connectError?.message ?? null,
    connect,
    disconnect,
    switchToPolygon,
  };
}
