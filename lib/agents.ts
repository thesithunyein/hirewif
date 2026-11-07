import { OPERATOR } from './config';

export const agents = [
  {
    id: 'research',
    name: 'Research',
    role: 'Deep research & synthesis',
    price: 25,
    address: OPERATOR,
    description: 'Structured research on any topic. Returns a clear brief with sources and key points.',
    tags: ['research', 'writing'],
  },
  {
    id: 'monitor',
    name: 'Monitor',
    role: 'Onchain & price monitoring',
    price: 15,
    address: OPERATOR,
    description: 'Watch wallets, tokens, or contracts and alert on specific conditions.',
    tags: ['monitoring', 'alerts'],
  },
  {
    id: 'content',
    name: 'Content',
    role: 'Drafts & rewrites',
    price: 20,
    address: OPERATOR,
    description: 'Clean writing for posts, docs, or product copy. Direct and precise.',
    tags: ['writing', 'content'],
  },
  {
    id: 'data',
    name: 'Data',
    role: 'Pull & organize data',
    price: 30,
    address: OPERATOR,
    description: 'Extract, clean, and structure data from public sources or onchain.',
    tags: ['data', 'analysis'],
  },
];