# TLT - Setup Guide

## Prerequisites

- **Node.js 18+**: For frontend development
- **Sui Wallet**: Browser extension (Sui Wallet, Ethos, or similar)
- **Testnet SUI**: Get from [Sui faucet](https://docs.sui.io/guides/developer/getting-started/get-address#get-sui-tokens)

## Quick Start (5 minutes)

### 1. Clone and Install

```bash
git clone https://github.com/N-45div/TLT
cd TLT/frontend
npm install
```

### 2. Configure Environment

The repository includes a deployed testnet instance. Just copy the example config:

```bash
cp .env.example .env
```

`.env` contents:
```env
# Sui Network
VITE_SUI_NETWORK=testnet

# Deployed Contracts (Testnet)
VITE_PACKAGE_ID=0x1908fe3aadd5a62f1d76c3f2d57744c726713756efe3b6c5e021bb7fb3f615f6
VITE_CLAIM_REGISTRY_ID=0xac8e77054a98a909e857623efb599c5c008986b6f5f8668d3a9b2b2267f798c4

# Seal Configuration
VITE_SEAL_PACKAGE_ID=0x1908fe3aadd5a62f1d76c3f2d57744c726713756efe3b6c5e021bb7fb3f615f6
VITE_SEAL_MODULE_NAME=time_lock_policy

# Walrus Storage
VITE_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
VITE_WALRUS_PUBLISHER=https://publisher.walrus-testnet.walrus.space
```

### 3. Run Development Server

```bash
npm run dev
```

Open http://localhost:5173 and connect your Sui wallet!

**✨ Live Demo**: https://tlt-eosin.vercel.app/

## Using the Application

### Create a Claim

1. Click **"New claim"** button
2. Fill in the form:
   - **Description**: "London temperature > 15°C on Dec 1, 2025"
   - **Location**: London
   - **Metric**: Temperature (°C)
   - **Operator**: `>`
   - **Threshold**: 15
   - **Deadline**: Future date/time
   - **Private Evidence**: Any text (will be encrypted with Seal)
3. Click **"Create claim"**
4. Approve transaction in wallet
5. Wait for confirmation toast

**What happens behind the scenes:**
- Claim spec uploaded to Walrus
- Evidence encrypted with Seal (time-locked to deadline)
- Encrypted evidence uploaded to Walrus
- Transaction creates claim on Sui with both blob IDs

### View Claims

- Claims auto-refresh every 10 seconds
- Filter by: All Markets / Active / Closed
- Each card shows:
  - Probability (YES %)
  - Mini chart visualization
  - Volume (total SUI staked)
  - Time remaining
  - Walrus blob IDs

### Stake on Outcome (UI Only - Future)

1. Click **YES** or **NO** button
2. Enter amount in modal
3. Click **"Confirm stake"**

Note: Staking contracts are not yet deployed. This demonstrates the UI flow.

## Advanced Setup

### Deploy Your Own Contracts

If you want to deploy your own instance:

#### 1. Install Sui CLI

```bash
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

#### 2. Setup Testnet

```bash
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
sui client switch --env testnet
sui client faucet  # Get testnet SUI
```

#### 3. Build and Publish Contracts

```bash
cd contracts
sui move build
sui client publish --gas-budget 100000000
```

Save the output:
- `Package ID`: Your deployed package
- `ClaimRegistry` shared object ID

#### 4. Update Frontend Config

Edit `frontend/.env`:
```env
VITE_PACKAGE_ID=<your_package_id>
VITE_CLAIM_REGISTRY_ID=<your_registry_id>
VITE_SEAL_PACKAGE_ID=<your_package_id>
```

#### 5. Test

```bash
cd frontend
npm run dev
```

Create a test claim and verify it appears in the UI!

## Development Workflow

### Hot Reload

The dev server supports hot module replacement:
```bash
npm run dev
```

Edit components in `src/components/` and see changes instantly.

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Build for Production

```bash
npm run build
npm run preview  # Test production build
```

## Troubleshooting

### "Connect your wallet first" toast

**Solution**: Install a Sui wallet extension and connect it:
- [Sui Wallet](https://chrome.google.com/webstore/detail/sui-wallet)
- [Ethos Wallet](https://ethoswallet.xyz/)

### "Please fill all fields" toast

**Solution**: All form fields are required:
- Description
- Location
- Threshold value
- Deadline (future date)
- Private evidence

### Claim not appearing after creation

**Possible causes:**
1. Transaction failed - Check wallet for error
2. Wrong network - Ensure wallet is on testnet
3. Polling delay - Wait 10 seconds for auto-refresh

**Debug steps:**
```bash
# Open browser console (F12)
# Look for error messages
# Check Network tab for failed requests
```

### Walrus upload fails

**Symptoms**: "Failed to create claim" after long wait

**Possible causes:**
- Walrus testnet is down
- Network connectivity issues
- Blob too large (>1MB)

**Solution**: Try again or check [Walrus status](https://status.walrus.site/)

### Seal encryption fails

**Symptoms**: Error mentioning "key servers" or "seal"

**Possible causes:**
- Key servers unavailable
- Wrong package ID in config
- Invalid deadline format

**Debug:**
```typescript
// Check CreateClaimDialog.tsx console logs
console.log('SealClient config:', {
  packageId: SEAL_PACKAGE_ID,
  serverIds: DEFAULT_SEAL_KEY_SERVERS,
});
```

## Understanding the Codebase

### Frontend Structure

```
frontend/src/
├── components/
│   ├── CreateClaimDialog.tsx   # Seal integration + Walrus uploads
│   ├── ClaimCard.tsx          # Polymarket-style market cards
│   ├── ClaimList.tsx          # Event querying + auto-refresh
│   ├── StakeDialog.tsx        # Staking UI (no backend yet)
│   ├── Header.tsx             # Wallet connection
│   ├── Landing.tsx            # Landing page
│   └── ui/                    # Reusable UI components
├── App.tsx                    # Main app + routing
└── main.tsx                   # Entry point
```

### Key Files to Study

**CreateClaimDialog.tsx** - The most complex component:
- Form state management
- Seal SDK integration
- Walrus HTTP API calls
- Sui transaction building
- Error handling + toasts

**ClaimList.tsx** - Event-based data fetching:
- Query `ClaimCreated` events
- Fetch claim objects
- Auto-refresh polling
- Loading states

**time_lock_policy.move** - Seal access policy:
```move
public fun seal_approve(
    id: vector<u8>,        // Deadline (BCS u64)
    clock: &Clock,
    _ctx: &mut TxContext
): bool {
    let deadline = from_bcs<u64>(&id);
    clock::timestamp_ms(clock) >= deadline
}
```

## Next Steps

### Implement Staking

1. Uncomment staking logic in `StakeDialog.tsx`
2. Deploy `market.move` contract
3. Wire up `market::stake` function
4. Test end-to-end flow

### Add Evidence Decryption UI

After deadline passes, users should be able to:
1. Fetch encrypted blob from Walrus
2. Build `seal_approve` transaction
3. Submit to Seal key servers
4. Decrypt and display evidence

Example flow:
```typescript
async function decryptEvidence(claimId: string) {
  const claim = await fetchClaim(claimId);
  
  // Check deadline passed
  if (Date.now() < claim.deadline) {
    throw new Error('Deadline not reached');
  }
  
  // Fetch encrypted blob
  const response = await fetch(
    `${WALRUS_AGGREGATOR}/v1/${claim.evidence_blob_id}`
  );
  const encryptedBlob = await response.arrayBuffer();
  
  // Build policy verification tx
  const tx = new Transaction();
  const idBytes = /* deadline as BCS u64 */;
  tx.moveCall({
    target: `${SEAL_PACKAGE_ID}::time_lock_policy::seal_approve`,
    arguments: [
      tx.pure(Array.from(idBytes)),
      tx.object('0x6'), // Clock
    ],
  });
  
  // Decrypt via Seal
  const decrypted = await sealClient.decrypt({
    data: new Uint8Array(encryptedBlob),
    txBytes: await tx.build({ client, onlyTransactionKind: true }),
    sessionKey: await getSessionKey(),
  });
  
  return new TextDecoder().decode(decrypted);
}
```

### Add Resolution Mechanism

1. Create admin/oracle role
2. Implement `resolve_claim(claim_id, result: bool)`
3. Verify evidence matches claim
4. Trigger payout distribution

## Resources

- **Seal Documentation**: https://seal.walrus.site/
- **Walrus Docs**: https://docs.walrus.site/
- **Sui Docs**: https://docs.sui.io/
- **Sui TypeScript SDK**: https://sdk.mystenlabs.com/typescript
- **dApp Kit**: https://sdk.mystenlabs.com/dapp-kit

## Support

For issues or questions:
1. Check [GitHub Issues](https://github.com/N-45div/TLT/issues)
2. Read the [Architecture Doc](./ARCHITECTURE.md)
3. Submit feedback on our [GitHub Repo](https://github.com/N-45div/TLT)

---

Built for **Walrus Haulout Hackathon 2025** - Data Security & Privacy Track
