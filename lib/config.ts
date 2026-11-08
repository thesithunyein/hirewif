export const OPERATOR = '0x7a35f63f81357dade2cff8f5699b935786aa9da2' as const;
// Flip this to the new address after contracts/HireWif.sol is deployed.
export const HIRE_CONTRACT = (process.env.NEXT_PUBLIC_HIRE_CONTRACT ?? '0x423B8701Da3a251a3A3fc2d241b71e8d05744C91') as `0x${string}`;
export const HIRE_CONTRACT_VERSION = process.env.NEXT_PUBLIC_HIRE_CONTRACT_VERSION === '2' ? 2 : 1;
export const BURN = '0x000000000000000000000000000000000000dEaD' as const;
export const BURN_BPS = 1000; // 10%
