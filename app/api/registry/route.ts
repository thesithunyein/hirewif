import { NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { robinhood } from '@/lib/chain';
import { HIRE_V3_ABI, HIRE_V3_ADDRESS } from '@/lib/v3';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export async function GET() {
  if (!HIRE_V3_ADDRESS) {
    return NextResponse.json(
      { agents: [], configured: false, updatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const count = await client.readContract({
      address: HIRE_V3_ADDRESS,
      abi: HIRE_V3_ABI,
      functionName: 'agentCount',
    });

    const total = Number(count);
    const agents: RegistryAgent[] = [];

    for (let i = 0; i < total; i += 1) {
      const key = await client.readContract({
        address: HIRE_V3_ADDRESS,
        abi: HIRE_V3_ABI,
        functionName: 'agentIdAt',
        args: [BigInt(i)],
      });
      const info = await client.readContract({
        address: HIRE_V3_ADDRESS,
        abi: HIRE_V3_ABI,
        functionName: 'agentInfo',
        args: [key],
      });
      const [payout, price, bond, hires, paid, burned, slashed, active] = info;
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

    return NextResponse.json(
      { agents, configured: true, updatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { error: 'registry read failed', configured: true },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
