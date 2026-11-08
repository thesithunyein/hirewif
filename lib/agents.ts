import { OPERATOR } from './config';

export type Agent = {
  id: string;
  name: string;
  role: string;
  price: number;
  address: string;
  description: string;
  tags: string[];
};

export const agents: Agent[] = [
  {
    id: 'monitor',
    name: 'Monitor',
    role: 'Live WIF market watch',
    price: 250,
    address: OPERATOR,
    description:
      'Price, market cap, liquidity and 24h volume from DexScreener, plus the largest WIF transfers from the chain. Fetched live on every call.',
    tags: ['price', 'volume', 'flow'],
  },
  {
    id: 'ledger',
    name: 'Ledger',
    role: 'Marketplace ledger',
    price: 500,
    address: OPERATOR,
    description:
      'Every hire on this marketplace, read from the Hired events. Total WIF paid, WIF burned, and which agents were hired.',
    tags: ['hires', 'earnings', 'burn'],
  },
  {
    id: 'data',
    name: 'Data',
    role: 'Onchain WIF data',
    price: 750,
    address: OPERATOR,
    description:
      'Supply, burn address, and transfer flow computed from the last 200,000 blocks of WIF logs. Returns the numbers and the source for each.',
    tags: ['onchain', 'transfers', 'supply'],
  },
  {
    id: 'research',
    name: 'Research',
    role: 'WIF brief',
    price: 1_000,
    address: OPERATOR,
    description:
      'Pulls market, supply and hire data into one brief and states what changed. No model, no invented sources, just the live numbers.',
    tags: ['brief', 'market', 'onchain'],
  },
];
