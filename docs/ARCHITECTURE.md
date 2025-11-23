# Truth Markets - Architecture

## Overview

Truth Markets is a decentralized prediction market platform with **Seal-encrypted evidence** storage. The system combines three key technologies:

- **Seal**: Identity-based encryption with time-lock policies for private evidence
- **Walrus**: Decentralized storage for claim specifications and encrypted evidence
- **Sui Move**: Onchain contracts for claim registry and access control policies

## System Components

### 1. Frontend (React + TypeScript)

#### CreateClaimDialog Component
The core Seal integration happens here:

```typescript
// 1. Build public claim spec
const spec = { description, location, metric, operator, threshold, deadline };

// 2. Upload spec to Walrus
const specRes = await fetch(`${WALRUS_PUBLISHER}/v1/blobs`, {
  method: 'PUT',
  body: JSON.stringify(spec),
});
const specBlobId = await specRes.text();

// 3. Encrypt evidence with Seal (time-lock)
const sealClient = new SealClient({
  suiClient,
  serverConfigs: KEY_SERVER_CONFIGS,
  verifyKeyServers: false,
});

// Encode deadline as identity (BCS u64)
const idBytes = new Uint8Array(8);
const view = new DataView(idBytes.buffer);
view.setBigUint64(0, BigInt(deadlineMs), true);
const idHex = '0x' + Array.from(idBytes).map(b => b.toString(16).padStart(2, '0')).join('');

// Encrypt
const { encryptedObject } = await sealClient.encrypt({
  threshold: 2,
  packageId: SEAL_PACKAGE_ID,
  id: idHex,
  data: evidenceBytes,
});

// 4. Upload encrypted evidence to Walrus
const evidenceRes = await fetch(`${WALRUS_PUBLISHER}/v1/blobs`, {
  method: 'PUT',
  body: encryptedObject,
});
const evidenceBlobId = await evidenceRes.text();

// 5. Create claim on Sui with both blob IDs
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::claim_registry::create_claim`,
  arguments: [
    tx.object(CLAIM_REGISTRY_ID),
    tx.pure.string(specBlobId),
    tx.pure.string(evidenceBlobId),
    tx.pure.string(description),
    tx.pure.u64(BigInt(deadlineMs)),
    tx.pure.u64(creatorFeeBps),
    tx.object('0x6'), // Clock
  ],
});
```

#### ClaimList Component
- Queries `ClaimCreated` events from Sui blockchain
- Fetches full claim objects to display current state
- Auto-refreshes every 10 seconds in background
- Displays Polymarket-style market cards

#### StakeDialog Component
- Modal interface for YES/NO staking
- Transaction submission to Sui (future market contract)
- Toast notifications for feedback

### 2. Sui Move Contracts

#### claim_registry.move
```move
public struct Claim has key, store {
    id: UID,
    description: String,
    creator: address,
    spec_blob_id: String,      // Walrus blob ID for claim spec
    evidence_blob_id: String,   // Walrus blob ID for encrypted evidence
    deadline: u64,
    creator_fee_bps: u64,
    yes_stake: u64,
    no_stake: u64,
    status: u8,  // 0=Active, 1=Cancelled, 2=Resolved
    result: Option<bool>,
}

public fun create_claim(
    registry: &mut ClaimRegistry,
    spec_blob_id: String,
    evidence_blob_id: String,
    description: String,
    deadline: u64,
    creator_fee_bps: u64,
    clock: &Clock,
    ctx: &mut TxContext
): ID {
    // Validation
    assert!(deadline > clock::timestamp_ms(clock), E_INVALID_DEADLINE);
    assert!(creator_fee_bps <= 1000, E_INVALID_FEE);
    
    // Create claim
    let claim_id = object::new(ctx);
    let claim_uid = object::uid_to_inner(&claim_id);
    
    let claim = Claim {
        id: claim_id,
        description,
        creator: tx_context::sender(ctx),
        spec_blob_id,
        evidence_blob_id,
        deadline,
        creator_fee_bps,
        yes_stake: 0,
        no_stake: 0,
        status: STATUS_ACTIVE,
        result: option::none(),
    };
    
    // Emit event
    event::emit(ClaimCreated {
        claim_id: claim_uid,
        creator: tx_context::sender(ctx),
        description,
        spec_blob_id,
        evidence_blob_id,
        deadline,
    });
    
    // Store claim
    ofield::add(&mut registry.id, claim_uid, claim);
    claim_uid
}
```

#### time_lock_policy.move
```move
/// Seal access policy: only decrypt after deadline
public fun seal_approve(
    id: vector<u8>,  // BCS-encoded deadline timestamp
    clock: &Clock,
    _ctx: &mut TxContext
): bool {
    let deadline = from_bcs<u64>(&id);
    clock::timestamp_ms(clock) >= deadline
}
```

This policy is called by Seal key servers to verify if decryption should be allowed.

#### market.move (Future)
Will handle:
- YES/NO staking with escrow
- Position tracking per user per claim
- Winner payout distribution
- Creator fee collection

### 3. Walrus Storage

#### Publisher API Integration
```typescript
// Upload blob
const response = await fetch('https://publisher.walrus-testnet.walrus.space/v1/blobs', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: data,
});
const blobId = await response.text();  // Returns blob ID
```

#### Blob Types

**Claim Spec (Public)**
```json
{
  "description": "London temperature > 15°C on Dec 1, 2025",
  "location": "London",
  "metric": "temperature_2m",
  "operator": ">",
  "threshold": 15,
  "deadline": "2025-12-01T12:00:00Z"
}
```

**Evidence (Encrypted)**
- Binary Seal ciphertext
- Contains:
  - Encrypted data
  - Key server IDs
  - Encryption metadata
  - Policy package ID

### 4. Seal Encryption Flow

#### Encryption (Client-Side)
1. User enters evidence in form
2. Convert to bytes: `new TextEncoder().encode(evidence)`
3. Encode deadline as BCS u64 bytes (little-endian)
4. Convert to hex identity: `0x{hex_bytes}`
5. Call `sealClient.encrypt({ packageId, id, data, threshold })`
6. Upload ciphertext to Walrus

#### Decryption (After Deadline)
1. Fetch encrypted blob from Walrus
2. Build transaction calling `seal_approve` in time_lock_policy
3. Submit to Seal key servers with tx bytes
4. Key servers verify: `current_time >= deadline` on-chain
5. If approved, key servers return decryption keys
6. Decrypt locally: `sealClient.decrypt({ data, txBytes, sessionKey })`

### 5. Data Flow Diagram

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       ├─ 1. Fill Claim Form (description, evidence, deadline)
       │
       ▼
┌─────────────────────┐
│  React Frontend     │
│  CreateClaimDialog  │
└──────┬──────────────┘
       │
       ├─ 2. Build Spec JSON
       │    ↓
       │  ┌──────────────┐
       │  │   Walrus     │ ← PUT /v1/blobs
       │  │  Publisher   │ → spec_blob_id
       │  └──────────────┘
       │
       ├─ 3. Encrypt Evidence
       │    ↓ SealClient.encrypt()
       │    ↓ (time-lock: deadline)
       │    ↓
       │  ┌──────────────┐
       │  │   Walrus     │ ← PUT /v1/blobs
       │  │  Publisher   │ → evidence_blob_id
       │  └──────────────┘
       │
       ├─ 4. Submit Transaction
       │    ↓
       ▼    ▼
┌───────────────────────┐
│  Sui Move Contracts   │
│  ClaimRegistry        │
│  - create_claim()     │
│  - emits ClaimCreated │
└───────────────────────┘
       │
       ├─ Event: ClaimCreated { claim_id, spec_blob_id, evidence_blob_id }
       │
       ▼
┌───────────────────────┐
│  Frontend Polling     │
│  - Query events       │
│  - Display claims     │
└───────────────────────┘
```

## Security Model

### Trust Assumptions

1. **Walrus**: Data availability and immutability
   - Blob IDs are content-addressed
   - Cannot be tampered with after upload
   - Decentralized storage ensures availability

2. **Seal Key Servers**: Threshold decryption
   - 2-of-2 servers required for decryption
   - Servers verify policy on-chain before releasing keys
   - No single point of failure

3. **Sui Blockchain**: Policy enforcement
   - Time-lock policy code is immutable
   - Clock object provides trusted timestamps
   - Transaction execution is deterministic

### Attack Vectors & Mitigations

**Early Decryption**
- Attack: Try to decrypt evidence before deadline
- Mitigation: Seal servers verify `clock >= deadline` on-chain
- Result: Decryption fails until deadline passes

**Evidence Tampering**
- Attack: Modify encrypted evidence on Walrus
- Mitigation: Walrus blob IDs are content-addressed
- Result: Any modification changes the blob ID, breaking the reference

**Fake Claims**
- Attack: Create claims with invalid blob IDs
- Mitigation: Frontend validates blob existence before display
- Result: Invalid claims don't render in UI

**Policy Bypass**
- Attack: Try to bypass time-lock policy
- Mitigation: Policy code is immutable in deployed package
- Result: Cannot change policy after deployment

## Performance Characteristics

### Claim Creation
- **Walrus Uploads**: ~2-5 seconds each (2 uploads total)
- **Seal Encryption**: <1 second client-side
- **Sui Transaction**: ~2-3 seconds confirmation
- **Total**: ~7-15 seconds end-to-end

### Claim Display
- **Event Query**: ~1 second for 50 events
- **Object Fetch**: ~100ms per claim
- **Total**: ~2-3 seconds for initial load
- **Refresh**: Background polling every 10 seconds

### Evidence Decryption (Future)
- **Policy Verification**: ~1 second (on-chain read)
- **Key Server Response**: ~2-3 seconds
- **Decryption**: <1 second client-side
- **Total**: ~4-6 seconds

## Scalability

### Current Limits
- **Claims**: Unlimited (events + dynamic fields)
- **Evidence Size**: Limited by Walrus blob size
- **Concurrent Users**: Limited by RPC rate limits
- **Refresh Rate**: 10 seconds (can be adjusted)

### Future Optimizations
- Indexer service for faster queries
- Blob caching for frequently accessed claims
- Batch transaction submission
- WebSocket for real-time updates

## Extension Points

### 1. Additional Policy Types
```move
// Whitelist policy: only specific addresses can decrypt
public fun whitelist_policy(
    id: vector<u8>,  // Address to check
    whitelist: &Whitelist,
    ctx: &TxContext
): bool {
    let caller = tx_context::sender(ctx);
    whitelist::contains(whitelist, caller)
}

// Token-gated policy: must hold NFT to decrypt
public fun nft_gate_policy(
    id: vector<u8>,
    collection: &Collection,
    ctx: &TxContext
): bool {
    let caller = tx_context::sender(ctx);
    collection::owns_token(collection, caller)
}
```

### 2. Multi-Party Claims
- Multiple creators contribute evidence
- Each evidence piece encrypted separately
- All must decrypt for full picture
- Useful for collaborative investigations

### 3. Progressive Disclosure
- Evidence encrypted in layers
- Different deadlines for different layers
- Gradual information reveal over time
- Useful for time-sensitive information

## Technology Choices

### Why Seal?
- **Identity-based encryption**: No key management needed
- **Programmable policies**: Flexible access control via Move
- **Threshold encryption**: No single point of failure
- **Sui-native**: Tight integration with Sui contracts

### Why Walrus?
- **Decentralized**: No single storage provider
- **Content-addressed**: Tamper-proof blob IDs
- **Sui integration**: Native Blob objects on-chain
- **Cost-effective**: Cheaper than on-chain storage

### Why Sui?
- **Fast finality**: 2-3 second transaction confirmation
- **Move language**: Safe, expressive smart contracts
- **Object model**: Flexible data structures
- **Events**: Efficient off-chain indexing
