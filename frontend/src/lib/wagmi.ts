import { http, createConfig } from 'wagmi';
import { mainnet, polygon } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [polygon],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [polygon.id]: http(),
    [mainnet.id]: http(),
  },
});

export const SUPPORTED_CHAIN = polygon;