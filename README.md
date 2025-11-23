# 🔒 TLT - TimeLocked Truth

**Privacy-Preserving Prediction Markets with Time-Locked Evidence**

> Seal-encrypted evidence + Walrus storage + Sui smart contracts = Provably private truth markets

Built for **Walrus Haulout Hackathon 2025** | **Track: Data Security and Privacy**

[![Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://tlt-eosin.vercel.app/)
[![Testnet](https://img.shields.io/badge/Network-Sui_Testnet-blue)](https://testnet.suivision.xyz/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 📋 Hackathon Submission

- **Track**: Data Security and Privacy
- **Network**: Sui Testnet
- **Package ID**: `0x1908fe3aadd5a62f1d76c3f2d57744c726713756efe3b6c5e021bb7fb3f615f6`
- **ClaimRegistry**: `0xac8e77054a98a909e857623efb599c5c008986b6f5f8668d3a9b2b2267f798c4`
- **GitHub**: [https://github.com/N-45div/TLT](https://github.com/N-45div/TLT) _(Public)_
- **Demo Video**: _(Coming soon - Max 3 minutes)_
- **Live App**: https://tlt-eosin.vercel.app/ ✨

## 🚀 What is TLT?

**TLT (TimeLocked Truth)** is the **first Polymarket-style prediction market on Sui** with end-to-end encrypted evidence. Users can create claims with private evidence that stays encrypted until a deadline passes, enabling privacy-preserving truth markets.

## 🔒 Why Data Security and Privacy Track?

TLT directly addresses the **Data Security and Privacy** track by implementing:

### 1. End-to-End Encryption with Seal
Unlike traditional prediction markets where all data is public, TLT uses **Seal** (Mysten's identity-based encryption SDK) to protect sensitive evidence:

- **Private Evidence**: Claim creators can attach confidential supporting data
- **Zero Trust**: Evidence encrypted client-side before upload
- **Threshold Encryption**: 2-of-2 key servers required for decryption
- **No Data Leakage**: Encrypted blobs stored on Walrus are unreadable without keys

### 2. Programmable Access Control
Access to encrypted evidence is governed by **onchain Sui Move policies**:

```move
// time_lock_policy.move
public fun seal_approve(
    id: vector<u8>,        // Deadline timestamp (BCS-encoded)
    clock: &Clock,
    ctx: &mut TxContext
): bool {
    let deadline = from_bcs<u64>(&id);
    clock::timestamp_ms(clock) >= deadline  // Only decrypt after deadline
}
```

- **Time-Locked**: Evidence automatically decryptable after market resolution
- **Policy Enforcement**: No centralized key holders or admins
- **Immutable Rules**: Access logic stored on blockchain

### 3. Privacy-Preserving Markets
TLT enables **confidential prediction markets** for sensitive topics:

- **Whistleblower Claims**: Report fraud with encrypted evidence
- **Insider Information**: Prove knowledge without revealing source
- **Corporate Events**: Predict outcomes with confidential data
- **Political Predictions**: Stake on outcomes without exposing sources

### Key Innovation: Seal-Encrypted Evidence

This is the **first prediction market** that combines:
- 🔐 **Time-locked encryption**: Evidence revealed only after deadline
- 🔒 **Policy-controlled access**: Move contracts govern decryption
- 📦 **Decentralized storage**: Walrus ensures data availability
- ✅ **Verifiable privacy**: Cryptographic proofs without trusted parties

### Tech Stack

- **[Seal](https://seal.walrus.site/)**: Identity-based encryption with programmable access control
- **[Walrus](https://walrus.site/)**: Decentralized blob storage for specs and encrypted evidence
- **[Sui](https://sui.io/)**: Layer-1 blockchain for claim registry and market logic

## Architecture

```
                    User Creates Claim
                          │
                          ▼
              ┌───────────────────────┐
              │   React Frontend      │
              │   • Form input        │
              │   • Seal SDK client   │
              └───────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
    1. Build Spec    2. Encrypt       3. Create
      (JSON)          Evidence         Claim Tx
                     (Seal SDK)
         │                │                │
         ▼                ▼                │
┌──────────────┐  ┌──────────────┐       │
│   Walrus     │  │   Walrus     │       │
│  Publisher   │  │  Publisher   │       │
│              │  │              │       │
│ Spec Blob ID │  │ Evidence     │       │
└──────────────┘  │  Blob ID     │       │
         │        └──────────────┘       │
         │                │              │
         └────────────────┼──────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Sui Move Contracts   │
              │  • ClaimRegistry      │
              │  • time_lock_policy   │
              │  • Event emission     │
              └───────────────────────┘
                          │
                          ▼
                  Claim stored on-chain
              (with both Walrus blob IDs)
```

### Data Flow

1. **Claim Creation**
   - User fills form → Build public ClaimSpec JSON
   - Upload spec to Walrus → Get `spec_blob_id`
   - Encrypt evidence with Seal (time-locked to deadline)
   - Upload encrypted evidence to Walrus → Get `evidence_blob_id`
   - Submit transaction to Sui with both blob IDs

2. **Staking** (Future)
   - Users stake YES/NO on outcome
   - Funds escrowed in Market contract

3. **Resolution** (Future)
   - After deadline passes, evidence becomes decryptable
   - Oracle verifies claim against evidence
   - Winners receive proportional payouts

## ✨ Features

### 🎨 Polymarket-Style UI
- **Modern Dark Theme**: Linear-inspired design with smooth animations
- **Live Market Cards**: Real-time probability displays with mini charts
- **Buy/Sell Interface**: Toggle between trading modes
- **Toast Notifications**: Professional feedback system (no browser popups!)
- **Auto-Refresh**: Background polling without UI disruption

### 🔒 Seal Integration
- **End-to-End Encryption**: Evidence encrypted before upload
- **Time-Lock Policy**: Automatic decryption after deadline
- **Programmable Access**: Move-based policy enforcement
- **Key Server Network**: Distributed threshold encryption

### 📊 Market Features
- **Weather Claims**: Temperature, precipitation, wind speed thresholds
- **YES/NO Staking**: Simple binary outcome markets
- **Real-Time Updates**: Claims refresh every 10 seconds
- **Event-Based Tracking**: On-chain events for claim history
- **Wallet Integration**: Sui dApp Kit with multiple wallet support

### 🛡️ Future Enhancements
- **Oracle Resolution**: Multi-source verification for automated claim resolution
- **Decryption & Verification**: Time-locked evidence becomes accessible after deadline
- **Transparent Proofs**: All data verifiable on Walrus

## Project Structure

```
TLT/
├── contracts/                    # Sui Move smart contracts
│   ├── sources/
│   │   ├── claim_registry.move  # Main claim lifecycle & storage
│   │   ├── time_lock_policy.move # Seal access policy
│   │   ├── market.move          # Staking logic (future)
│   │   └── attestation.move     # Oracle verification (future)
│   └── Move.toml
├── frontend/                    # React + TypeScript dApp
│   ├── src/
│   │   ├── components/         # UI components
│   │   │   ├── CreateClaimDialog.tsx  # Seal integration here
│   │   │   ├── ClaimCard.tsx
│   │   │   ├── StakeDialog.tsx
│   │   │   └── ...
│   │   └── App.tsx
│   ├── package.json
│   └── .env                    # Config (Package IDs, Walrus URLs)
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md
│   └── SETUP.md
├── README.md
└── LICENSE
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** for frontend
- **Sui Wallet** (Sui Wallet, Ethos, or similar)
- **Testnet SUI** tokens

### Run Locally

```bash
# Clone the repository
git clone https://github.com/N-45div/TLT
cd TLT

# Install frontend dependencies
cd frontend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values (or use provided testnet deployment)

# Start development server
npm run dev
```

Open https://tlt-eosin.vercel.app/ or run locally at http://localhost:5173

### Deploy Contracts (Advanced)

```bash
# Build and publish contracts
cd contracts
sui move build
sui client publish --gas-budget 100000000

# Save the Package ID and update frontend/.env
```

## 🎬 How It Works

### 1. Create a Claim
```
User fills form:
├── Description: "London temperature > 10°C on Dec 1, 2025"
├── Location: London
├── Metric: Temperature
├── Threshold: 10°C
├── Deadline: Dec 1, 2025 12:00 UTC
└── Private Evidence: [Encrypted with Seal]
```

**Behind the scenes:**
1. **Spec Upload**: Public claim spec → Walrus (blob ID returned)
2. **Evidence Encryption**: Seal encrypts evidence with time-lock policy (deadline timestamp)
3. **Evidence Upload**: Encrypted blob → Walrus (blob ID returned)
4. **Claim Creation**: Transaction to Sui Move contract with both blob IDs

### 2. Stake on Outcome
```
Market displays:
├── YES: 38% chance ($150 staked)
├── NO: 62% chance ($250 staked)
└── Buy/Sell toggle interface
```

Users click **YES** or **NO** → Modal opens → Enter amount → Confirm transaction

### 3. Decryption (After Deadline)
```
Once deadline passes:
├── Time-lock policy: current_time >= deadline ✓
├── Anyone can request decryption keys from Seal servers
├── Seal key servers verify policy on-chain
├── Decryption keys released
└── Encrypted evidence becomes readable
```

### 4. Resolution & Payout (Future)
```
With evidence now accessible:
├── Oracle/resolver verifies claim against evidence
├── Submit result to Sui
├── Winners determined based on outcome
└── Proportional payouts from escrow
```

## 🔑 Technical Highlights

### Seal Integration
- **Time-Lock Encryption**: Evidence locked until deadline using BCS-encoded timestamp as identity
- **Key Server Network**: 2 testnet Seal servers with threshold encryption
- **Policy Enforcement**: `time_lock_policy.move` contract verifies deadline before approving decryption

### Walrus Storage
- **Spec Storage**: Public claim specifications (JSON format)
- **Evidence Storage**: Encrypted blobs (Seal ciphertext)  
- **Decentralized**: Content-addressed, immutable, verifiable
- **Publisher API**: HTTP uploads via testnet publisher endpoint

### Sui Move Contracts
- **ClaimRegistry**: Creates claims, stores blob IDs, emits events
- **time_lock_policy**: Seal access control (deadline-based decryption)
- **Market**: YES/NO staking, escrow, payouts (future implementation)

### Frontend Stack
- **React 18** + TypeScript + Vite
- **Seal SDK** (`@mysten/seal`) for client-side encryption
- **Sui dApp Kit** (`@mysten/dapp-kit`) for wallet connection  
- **Walrus HTTP API** for blob storage
- **Sonner** for toast notifications
- **TailwindCSS** + Radix UI for modern UI

## 🎯 Roadmap & Future Extensions

### Phase 1: MVP ✅ (Current)
- [x] Seal integration with time-lock encryption
- [x] Walrus storage for specs and evidence
- [x] Sui Move contracts (ClaimRegistry)
- [x] Polymarket-style UI
- [x] Toast notifications and smooth UX
- [x] Real-time market updates

### Phase 2: Market Mechanics (Coming Soon)
- [ ] YES/NO staking with escrow
- [ ] Proportional winner payouts
- [ ] Creator fee collection
- [ ] Position management and history

### Phase 3: Oracle & Resolution
- [ ] Evidence decryption UI (post-deadline)
- [ ] Manual resolution interface
- [ ] Automated oracle integration (multi-source verification)
- [ ] Result submission and verification

### Phase 4: Advanced Features
- [ ] Additional claim types (crypto prices, sports, events)
- [ ] Reputation scoring for creators
- [ ] AMM-style continuous markets
- [ ] Dispute resolution mechanism
- [ ] Mobile app with Sui zkLogin
- [ ] Cross-chain evidence bridging

## 💡 Use Cases

### 1. Whistleblower Markets
```
Claim: "Company X will report fraud within 30 days"
Evidence: [Encrypted internal documents]
Privacy: Evidence time-locked until outcome is public
```

### 2. Insider Trading (Legal)
```
Claim: "Product launch will be delayed beyond Q4"
Evidence: [Encrypted supply chain data]
Privacy: Information revealed only after announcement
```

### 3. Scientific Predictions
```
Claim: "Paper will be retracted due to data issues"
Evidence: [Encrypted methodology concerns]
Privacy: Protected until formal investigation concludes
```

### 4. Political Forecasting
```
Claim: "Policy change will be announced by date X"
Evidence: [Encrypted insider communications]
Privacy: Sources protected until public announcement
```

## 🏗️ Built With

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **UI Library**: Radix UI, Lucide Icons, Sonner (toasts)
- **Blockchain**: @mysten/sui, @mysten/dapp-kit, @mysten/seal
- **Storage**: Walrus Testnet (Publisher API)
- **Smart Contracts**: Sui Move, Sui CLI

## 🤝 Contributing

This project was built for the Walrus Haulout Hackathon. Contributions are welcome after the hackathon ends!

## 📄 License

MIT - See [LICENSE](./LICENSE) for details

## 👥 Team

Built with ❤️ for **Walrus Haulout Hackathon 2025**

- Track: Data Security and Privacy
- Technologies: Seal, Walrus, Sui

## 🔗 Links

- **Sui Testnet Explorer**: [View Package](https://testnet.suivision.xyz/package/0x1908fe3aadd5a62f1d76c3f2d57744c726713756efe3b6c5e021bb7fb3f615f6)
- **Seal Documentation**: [https://seal.walrus.site/](https://seal.walrus.site/)
- **Walrus Documentation**: [https://docs.walrus.site/](https://docs.walrus.site/)
- **Sui Documentation**: [https://docs.sui.io/](https://docs.sui.io/)

---

**Built for Walrus Haulout Hackathon 2025** 🦭
