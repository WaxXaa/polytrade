/**
 * useWallet — manages MetaMask wallet connection on Polygon network.
 *
 * Polls connection status every 30 seconds.
 * Handles: connect, disconnect, network switch, balance refresh.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';

const POLYGON_CHAIN_ID = '0x89'; // 137 decimal
const POLYGON_CHAIN_ID_DEC = 137;

// Minimal ERC-20 ABI for balanceOf
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

// USDC on Polygon
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

export interface WalletState {
  connected: boolean;
  address: string | null;
  truncatedAddress: string | null;
  usdcBalance: number;
  chainId: number | null;
  isPolygon: boolean;
  connecting: boolean;
  error: string | null;
}

export interface UseWalletReturn extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToPolygon: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function useWallet(): UseWalletReturn {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    truncatedAddress: null,
    usdcBalance: 0,
    chainId: null,
    isPolygon: false,
    connecting: false,
    error: null,
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getProvider = useCallback((): ethers.BrowserProvider | null => {
    if (typeof window === 'undefined' || !window.ethereum) return null;
    return new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
  }, []);

  const fetchUsdcBalance = useCallback(async (address: string): Promise<number> => {
    const provider = getProvider();
    if (!provider) return 0;
    try {
      const contract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
      const [raw, decimals] = await Promise.all([
        contract.balanceOf(address) as Promise<bigint>,
        contract.decimals() as Promise<number>,
      ]);
      return Number(ethers.formatUnits(raw, decimals));
    } catch {
      return 0;
    }
  }, [getProvider]);

  const refreshBalance = useCallback(async () => {
    if (!state.address) return;
    const balance = await fetchUsdcBalance(state.address);
    setState((prev) => ({ ...prev, usdcBalance: balance }));
  }, [state.address, fetchUsdcBalance]);

  const checkStatus = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return;

    try {
      const accounts = await provider.listAccounts();
      if (accounts.length === 0) {
        setState((prev) => ({
          ...prev,
          connected: false,
          address: null,
          truncatedAddress: null,
          usdcBalance: 0,
          chainId: null,
          isPolygon: false,
        }));
        return;
      }

      const address = accounts[0]!.address;
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      const isPolygon = chainId === POLYGON_CHAIN_ID_DEC;
      const usdcBalance = isPolygon ? await fetchUsdcBalance(address) : 0;

      setState((prev) => ({
        ...prev,
        connected: true,
        address,
        truncatedAddress: truncateAddress(address),
        usdcBalance,
        chainId,
        isPolygon,
        error: null,
      }));
    } catch {
      // silently ignore polling errors
    }
  }, [getProvider, fetchUsdcBalance]);

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setState((prev) => ({ ...prev, error: 'MetaMask not detected. Please install MetaMask.' }));
      return;
    }

    setState((prev) => ({ ...prev, connecting: true, error: null }));

    try {
      await provider.send('eth_requestAccounts', []);
      await checkStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection rejected';
      setState((prev) => ({ ...prev, error: message, connecting: false }));
      return;
    }

    setState((prev) => ({ ...prev, connecting: false }));
  }, [getProvider, checkStatus]);

  const disconnect = useCallback(() => {
    setState({
      connected: false,
      address: null,
      truncatedAddress: null,
      usdcBalance: 0,
      chainId: null,
      isPolygon: false,
      connecting: false,
      error: null,
    });
  }, []);

  const switchToPolygon = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return;

    try {
      await provider.send('wallet_switchEthereumChain', [{ chainId: POLYGON_CHAIN_ID }]);
      await checkStatus();
    } catch (err: unknown) {
      // Chain not added yet — add it
      if ((err as { code?: number }).code === 4902) {
        try {
          await provider.send('wallet_addEthereumChain', [{
            chainId: POLYGON_CHAIN_ID,
            chainName: 'Polygon Mainnet',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrls: ['https://polygon-rpc.com/'],
            blockExplorerUrls: ['https://polygonscan.com/'],
          }]);
          await checkStatus();
        } catch {
          setState((prev) => ({ ...prev, error: 'Failed to add Polygon network.' }));
        }
      }
    }
  }, [getProvider, checkStatus]);

  // Poll every 30 seconds
  useEffect(() => {
    void checkStatus();

    pollRef.current = setInterval(() => {
      void checkStatus();
    }, 30_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkStatus]);

  // Listen for MetaMask account/chain changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const eth = window.ethereum as { on: (e: string, cb: () => void) => void; removeListener: (e: string, cb: () => void) => void };
    const handler = () => { void checkStatus(); };

    eth.on('accountsChanged', handler);
    eth.on('chainChanged', handler);

    return () => {
      eth.removeListener('accountsChanged', handler);
      eth.removeListener('chainChanged', handler);
    };
  }, [checkStatus]);

  return { ...state, connect, disconnect, switchToPolygon, refreshBalance };
}
