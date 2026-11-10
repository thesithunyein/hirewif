import { keccak256, toBytes } from 'viem';

export const HIRE_V3_ABI = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'bytes32' },
      { name: 'price', type: 'uint256' },
      { name: 'payout', type: 'address' },
      { name: 'bond', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'updateAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'bytes32' },
      { name: 'price', type: 'uint256' },
      { name: 'bond', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'hire',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'bytes32' },
      { name: 'taskHash', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' },
      { name: 'maxPrice', type: 'uint256' },
    ],
    outputs: [{ name: 'hireId', type: 'uint256' }],
  },
  {
    name: 'commit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'hireId', type: 'uint256' },
      { name: 'answerHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'claimRefund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'hireId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'withdrawEarnings',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'closeAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'agentCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'agentIdAt',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'agentInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [
      { name: 'payout', type: 'address' },
      { name: 'price', type: 'uint256' },
      { name: 'bond', type: 'uint256' },
      { name: 'hires_', type: 'uint256' },
      { name: 'paid', type: 'uint256' },
      { name: 'burned', type: 'uint256' },
      { name: 'slashed', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    name: 'earnings',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'COMMIT_WINDOW',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'BOND_MULTIPLE',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalPaid',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalBurned',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'agentReserve',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [
      { name: 'reserved', type: 'uint256' },
      { name: 'open', type: 'uint256' },
    ],
  },
  {
    name: 'hires',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'agentId', type: 'bytes32' },
      { name: 'hirer', type: 'address' },
      { name: 'paid', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'committed', type: 'bool' },
      { name: 'refunded', type: 'bool' },
      { name: 'answerHash', type: 'bytes32' },
    ],
  },
  {
    name: 'totalRefunded',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const raw = process.env.NEXT_PUBLIC_HIRE_V3_CONTRACT ?? '';

/** V3 is only used once a deployment address is configured. The V1 rail keeps working until then. */
export const HIRE_V3_ADDRESS = /^0x[0-9a-fA-F]{40}$/.test(raw) ? (raw as `0x${string}`) : null;

export const HIRE_V3_CONFIGURED = HIRE_V3_ADDRESS !== null;

export const BOND_MULTIPLE = 10n;

/** Seconds an operator has to commit an answer before the hirer can be refunded from the bond. */
export const COMMIT_WINDOW_SECONDS = 600;

/** Registry keys are keccak256 of the normalised agent id, on both the site and the contract. */
export function agentKeyFor(id: string): `0x${string}` {
  return keccak256(toBytes(id.trim().toLowerCase()));
}

export function taskHashFor(task: string): `0x${string}` {
  return keccak256(toBytes(task.trim()));
}
