import { createPublicClient, formatUnits, http, type Address } from 'viem';
import { robinhood } from './chain';
import { HIRE_V3_ABI, HIRE_V3_ADDRESS } from './v3';

const RPC_URL = process.env.ROBINHOOD_RPC ?? 'https://rpc.mainnet.chain.robinhood.com';
const client = createPublicClient({ chain: robinhood, transport: http(RPC_URL) });

export type RegistryAgent = {
  id: string;
  key: string;
  payout: string;
  price: number;
  bond: number;
  hires: number;
  paid: number;
  burned: number;
  slashed: number;
  active: boolean;
};

export type RegistrySnapshot = {
  configured: boolean;
  agents: RegistryAgent[];
  listed: number;
  active: number;
  bonded: number;
  slashed: number;
  hires: number;
  burned: number;
};

export async function readRegistry(): Promise<RegistrySnapshot> {
  const empty: RegistrySnapshot = {
    configured: false,
    agents: [],
    listed: 0,
    active: 0,
    bonded: 0,
    slashed: 0,
    hires: 0,
    burned: 0,
  };
  if (!HIRE_V3_ADDRESS) return empty;

  try {
    const count = await client.readContract({
      address: HIRE_V3_ADDRESS,
      abi: HIRE_V3_ABI,
      functionName: 'agentCount',
    });

    const agents: RegistryAgent[] = [];
    for (let index = 0; index < Number(count); index += 1) {
      const key = await client.readContract({
        address: HIRE_V3_ADDRESS,
        abi: HIRE_V3_ABI,
        functionName: 'agentIdAt',
        args: [BigInt(index)],
      });
      const [payout, price, bond, hires, paid, burned, slashed, active] = await client.readContract({
        address: HIRE_V3_ADDRESS,
        abi: HIRE_V3_ABI,
        functionName: 'agentInfo',
        args: [key],
      });
      agents.push({
        id: key,
        key,
        payout: payout as Address,
        price: Number(formatUnits(price, 18)),
        bond: Number(formatUnits(bond, 18)),
        hires: Number(hires),
        paid: Number(formatUnits(paid, 18)),
        burned: Number(formatUnits(burned, 18)),
        slashed: Number(formatUnits(slashed, 18)),
        active,
      });
    }

    return {
      configured: true,
      agents,
      listed: agents.length,
      active: agents.filter((agent) => agent.active).length,
      bonded: agents.reduce((sum, agent) => sum + agent.bond, 0),
      slashed: agents.reduce((sum, agent) => sum + agent.slashed, 0),
      hires: agents.reduce((sum, agent) => sum + agent.hires, 0),
      burned: agents.reduce((sum, agent) => sum + agent.burned, 0),
    };
  } catch {
    return { ...empty, configured: true };
  }
}
