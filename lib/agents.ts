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
    role: 'Live market data',
    price: 250,
    address: OPERATOR,
    description:
      'Current WIF price, market cap, liquidity, 24h volume, and largest transfers. Uses DexScreener and Robinhood Chain.',
    tags: ['price', 'volume', 'flow'],
  },
  {
    id: 'ledger',
    name: 'Ledger',
    role: 'Marketplace activity',
    price: 500,
    address: OPERATOR,
    description:
      'Total hires, WIF paid, WIF burned, and the most-used agents on this marketplace.',
    tags: ['hires', 'earnings', 'burn'],
  },
  {
    id: 'data',
    name: 'Data',
    role: 'Onchain WIF data',
    price: 750,
    address: OPERATOR,
    description:
      'WIF supply, burn balance, and recent transfer flow from Robinhood Chain.',
    tags: ['onchain', 'transfers', 'supply'],
  },
  {
    id: 'research',
    name: 'Research',
    role: 'WIF market brief',
    price: 1_000,
    address: OPERATOR,
    description:
      'A decision brief with live market conditions, supply context, marketplace traction, risks, and source links.',
    tags: ['brief', 'market', 'onchain'],
  },
];
