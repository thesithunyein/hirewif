#!/usr/bin/env bash
# Deploy HireWifV3 to Robinhood Chain and list the four agents with their bonds.
#
# Keys never touch this script. Import the funded wallet into a Foundry keystore once:
#   cast wallet import hirewif-deployer --interactive
# and the script asks for the keystore password on each transaction.
#
# Usage:
#   PAYOUT=0xHotWallet DEPLOYER=0xYourWallet ./scripts/deploy-v3.sh
#
# PAYOUT is the server's hot wallet: it receives the 90% and signs answer commits.
# Prices are in whole WIF; bonds are 10x each price. Defaults fit a ~447 WIF balance.
set -euo pipefail

RPC="${RPC:-https://rpc.mainnet.chain.robinhood.com}"
ACCOUNT="${ACCOUNT:-hirewif-deployer}"
WIF=0x5173b8eA6923c2d40267890D45C46a3480954773
: "${PAYOUT:?set PAYOUT to the server hot wallet address}"
: "${DEPLOYER:?set DEPLOYER to the address of the keystore wallet}"

AGENTS=(monitor ledger data research)
PRICES=("${PRICE_MONITOR:-4}" "${PRICE_LEDGER:-8}" "${PRICE_DATA:-12}" "${PRICE_RESEARCH:-20}")

total_bond=0
for p in "${PRICES[@]}"; do total_bond=$((total_bond + p * 10)); done
total_bond_wei=$(cast to-wei "$total_bond")

balance=$(cast call "$WIF" "balanceOf(address)(uint256)" "$DEPLOYER" --rpc-url "$RPC" | awk '{print $1}')
echo "Bonds needed: $total_bond WIF. Wallet holds: $(cast from-wei "$balance") WIF."
if awk -v b="$(cast from-wei "$balance")" -v n="$total_bond" 'BEGIN{exit !(b < n)}'; then
  echo "Not enough WIF for the bonds. Lower the prices or top up." >&2
  exit 1
fi

echo "== 1/4 deploying HireWifV3"
V3=$(forge create contracts/HireWifV3.sol:HireWifV3 \
  --rpc-url "$RPC" --account "$ACCOUNT" --broadcast | awk '/Deployed to:/ {print $3}')
[ -n "$V3" ] || { echo "Deploy failed: no address printed." >&2; exit 1; }
echo "HireWifV3: $V3"

echo "== 2/4 approving exactly $total_bond WIF for the bonds"
cast send "$WIF" "approve(address,uint256)" "$V3" "$total_bond_wei" \
  --rpc-url "$RPC" --account "$ACCOUNT"

echo "== 3/4 registering agents"
for i in "${!AGENTS[@]}"; do
  id="${AGENTS[$i]}"
  price_wei=$(cast to-wei "${PRICES[$i]}")
  bond_wei=$(cast to-wei "$((PRICES[$i] * 10))")
  cast send "$V3" "register(bytes32,uint256,address,uint256)" \
    "$(cast keccak "$id")" "$price_wei" "$PAYOUT" "$bond_wei" \
    --rpc-url "$RPC" --account "$ACCOUNT"
  echo "  $id: ${PRICES[$i]} WIF, bond $((PRICES[$i] * 10)) WIF"
done

echo "== 4/4 checking the registry"
cast call "$V3" "agentCount()(uint256)" --rpc-url "$RPC"
for id in "${AGENTS[@]}"; do
  echo "$id: $(cast call "$V3" "agentInfo(bytes32)(address,uint256,uint256,uint256,uint256,uint256,uint256,bool)" "$(cast keccak "$id")" --rpc-url "$RPC" | tr '\n' ' ')"
done

cat <<EOF

Done. Next:
  1. Vercel env: NEXT_PUBLIC_HIRE_V3_CONTRACT=$V3
                 OPERATOR_PRIVATE_KEY=<hot wallet key, never the deployer>
  2. Verify source:
     forge verify-contract $V3 contracts/HireWifV3.sol:HireWifV3 \\
       --verifier blockscout --verifier-url https://robinhoodchain.blockscout.com/api/ \\
       --rpc-url $RPC
EOF
