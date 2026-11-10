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
    role: 'Market',
    price: 4,
    address: OPERATOR,
    description:
      'Price, volume, liquidity and big transfers.',
    tags: ['price', 'volume', 'flow'],
  },
  {
    id: 'ledger',
    name: 'Ledger',
    role: 'Activity',
    price: 8,
    address: OPERATOR,
    description:
      'Hires, payments and burns on HireWif.',
    tags: ['hires', 'earnings', 'burn'],
  },
  {
    id: 'data',
    name: 'Data',
    role: 'Onchain',
    price: 12,
    address: OPERATOR,
    description:
      'Supply, burns and transfer flow.',
    tags: ['onchain', 'transfers', 'supply'],
  },
  {
    id: 'research',
    name: 'Research',
    role: 'Brief',
    price: 20,
    address: OPERATOR,
    description:
      'Everything above, with risks and sources.',
    tags: ['brief', 'market', 'onchain'],
  },
];
