# Wallet UI – btc-controller Example Adapter

A minimal end-to-end example demonstrating how to integrate the `btc-controller` wallet engine into a real application with proper architectural boundaries.

## 📋 Overview

This example consists of:
- **Frontend**: Plain HTML/CSS/JavaScript interface
- **Backend**: Lightweight Node.js Express adapter
- **Wallet Engine**: `btc-controller` for Bitcoin operations

The goal is to demonstrate correct architectural separation between a browser UI and a Node-based Bitcoin wallet engine, showing best practices for secure wallet integration.

> ⚠️ **This is not a production-ready wallet backend.** See [Security Considerations](#-security-considerations) below.

---

## 🏗️ Architecture

```
┌─────────────────────────┐
│   Browser (HTML/JS)     │
│   - User Interface      │
│   - Display Logic       │
└───────────┬─────────────┘
            │ HTTP/REST
            ↓
┌─────────────────────────┐
│  Node.js Adapter        │
│  - Express Server       │
│  - API Endpoints        │
│  - Request Validation   │
└───────────┬─────────────┘
            │
            ↓
┌─────────────────────────┐
│  btc-controller         │
│  - Wallet Engine        │
│  - Key Management       │
│  - Transaction Building │
└─────────────────────────┘
```

### Why This Architecture?

The wallet engine depends on Node-only modules (`crypto`, `bip32`, `bip39`, `bitcoinjs-lib`) that cannot run in browsers. The adapter server bridges this gap while maintaining:

- **Security**: Private keys never leave the server
- **Separation**: Clear boundaries between UI and wallet logic
- **Flexibility**: Backend can implement custom policies and validation

---

## ⚠️ Security Considerations

### Current Demo Limitations

**DO NOT USE IN PRODUCTION**

This demo intentionally omits production requirements:

| Feature | Demo Status | Production Requirement |
|---------|-------------|----------------------|
| Wallet Persistence | ❌ In-memory only | ✅ Encrypted database storage |
| Authentication | ❌ None | ✅ JWT/OAuth + rate limiting |
| Private Key Storage | ❌ Plain memory | ✅ HSM or encrypted at rest |
| API Security | ❌ Open endpoints | ✅ HTTPS + API keys |
| Session Management | ❌ Stateless | ✅ Secure sessions |
| Audit Logging | ❌ None | ✅ Complete audit trail |

### Private Key Export

Private key export is **disabled by default** and should **never** be enabled in production.

To enable for testing only:
```bash
ALLOW_PRIVATE_KEY_EXPORT=true npm start
```

---

## ✨ Features Demonstrated

### Wallet Management
- ✅ Create HD wallet (BIP-39 mnemonic)
- ✅ Restore HD wallet from existing mnemonic
- ✅ Import single private key as standalone wallet
- ✅ List all derived accounts

### Balance & History
- ✅ Fetch address balance
- ✅ View transaction history
- ✅ Real-time balance updates

### Transactions
- ✅ Build transaction with inputs/outputs
- ✅ Sign transaction with wallet keys
- ✅ Broadcast to Bitcoin network
- ✅ Dynamic fee selection (slow/medium/fast)

### Receiving
- ✅ Generate receive addresses
- ✅ QR code generation
- ✅ Address derivation paths

### Network Support
- ✅ Mainnet
- ✅ Testnet
- ✅ Regtest (local development)

---

## 🔄 Transaction Lifecycle

The demo explicitly separates the transaction flow into three distinct phases:

```
1. BUILD     →     2. SIGN     →     3. BROADCAST
   ↓                  ↓                  ↓
Create PSBT      Add signatures     Send to network
Select UTXOs     Validate inputs    Confirm on-chain
Calculate fees   Generate witness   Track status
```

### Why This Separation?

This architecture reflects real-world requirements:
- **Multi-signature wallets**: Different parties sign separately
- **Hardware wallets**: Signing happens on external device
- **Policy enforcement**: Review before signing
- **Compliance**: Audit trail at each stage

---

## 🌐 Chain Backend

The adapter uses a **Blockstream-based backend** for blockchain interactions:

- Balance queries
- Transaction history
- Fee estimates (mempool data)
- Transaction broadcasting

### Backend Isolation

The chain backend is **isolated inside the adapter layer**. The `btc-controller` engine itself remains **blockchain-provider agnostic**, allowing you to swap backends without changing core wallet logic.

**Supported providers** (via adapter configuration):
- Blockstream API
- Your own Bitcoin node
- Other blockchain explorers

---

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

From the repository root:

```bash
# Navigate to wallet-ui directory
cd wallet-ui

# Install dependencies
npm install

# Start the server
npm run start:win   #for windows
npm run start   #for mac/linux
```

The server will start on:
```
http://localhost:3000
```

### Quick Test

1. Open http://localhost:3000
2. Click **"Create New Wallet"**
3. Save your mnemonic (test only!)
4. Select **testnet** network
5. Get a receive address
6. Fund it with testnet BTC from a faucet
7. Build and broadcast a test transaction

---

## 🔧 Configuration

### Environment Variables

```bash
# Server port (default: 3000)
PORT=3000

# Enable private key export (NEVER in production)
ALLOW_PRIVATE_KEY_EXPORT=false

# Default network (mainnet, testnet, regtest)
DEFAULT_NETWORK=testnet

# Blockstream API endpoint
BLOCKSTREAM_API=https://blockstream.info/testnet/api
```

### Network Selection

The demo supports three networks:

| Network | Use Case | API Endpoint |
|---------|----------|--------------|
| **mainnet** | Real Bitcoin | `blockstream.info/api` |
| **testnet** | Testing with test BTC | `blockstream.info/testnet/api` |
| **regtest** | Local development | Custom node required |

Network is passed to the wallet engine during initialization and affects:
- Address generation (prefix)
- Transaction validation
- Fee estimation
- Broadcasting endpoint

---

## 📁 Project Structure

```
wallet-ui/
├── server.js              # Express adapter server
├── public/
│   ├── index.html         # Main UI
│   ├── styles.css         # Styling
│   └── app.js             # Frontend logic
├── routes/
│   ├── wallet.js          # Wallet endpoints
│   ├── transaction.js     # Transaction endpoints
│   └── chain.js           # Blockchain query endpoints
└── README.md              # This file
```

---

## 🔌 API Endpoints

### Wallet Operations

```http
POST   /wallet/create          # Create new HD wallet
POST   /wallet/restore         # Restore from mnemonic
POST   /wallet/import          # Import private key
GET    /wallet/accounts        # List derived accounts
GET    /wallet/balance/:address
```

### Transaction Operations

```http
POST   /transaction/build      # Create unsigned transaction
POST   /transaction/sign       # Sign transaction
POST   /transaction/broadcast  # Send to network
GET    /transaction/fees       # Get current fee rates
```

### Chain Queries

```http
GET    /chain/balance/:address
GET    /chain/history/:address
GET    /chain/utxos/:address
```

---

## 🎯 Scope and Non-Goals

### ✅ This Example Covers

- On-chain Bitcoin wallet integration
- HD wallet derivation (BIP-32/BIP-39)
- Transaction construction and signing
- Multi-network support
- Frontend-backend separation

### ❌ Intentionally Excluded

The following are **out of scope** for this minimal example:

- ⚡ Lightning Network integration
- 🔄 Atomic swaps
- 🔐 Multi-signature / policy-based signing
- 🏦 Escrow or EMI flows
- 📊 Product-specific orchestration
- 🔒 Production security features
- 💾 Database persistence
- 👤 User authentication/authorization

These features belong in product-specific implementations built on top of this foundation.

---

## 👥 Intended Audience

This example is for:

- **Wallet developers** integrating `btc-controller` into applications
- **Backend engineers** building Bitcoin-enabled services
- **Security reviewers** understanding wallet architecture patterns
- **DevOps teams** deploying wallet infrastructure

### Prerequisites Knowledge

- JavaScript/Node.js fundamentals
- Basic Bitcoin concepts (addresses, transactions, UTXOs)
- REST API design patterns
- Understanding of public/private key cryptography

---

## 🧪 Testing

### Manual Testing Flow

1. **Create Wallet**
   ```
   Create new → Save mnemonic → Select testnet
   ```

2. **Fund Wallet**
   ```
   Get receive address → Use testnet faucet → Wait for confirmation
   ```

3. **Send Transaction**
   ```
   Build tx → Review details → Sign → Broadcast → Check explorer
   ```

### Testnet Faucets

- https://testnet-faucet.mempool.co/
- https://coinfaucet.eu/en/btc-testnet/
- https://bitcoinfaucet.uo1.net/

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Cannot find module 'bitcoinjs-lib'"
```bash
# Solution: Install dependencies
npm install
```

**Issue**: "Address has no UTXOs"
```bash
# Solution: Fund address with testnet BTC first
# Wait for 1 confirmation before spending
```

**Issue**: "Transaction broadcast failed"
```bash
# Check: 
# - Sufficient balance for amount + fees
# - UTXOs are confirmed
# - Network connection to Blockstream API
```

---

## 📚 Further Reading

- [BIP-32: Hierarchical Deterministic Wallets](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
- [BIP-39: Mnemonic Code for Generating Keys](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [BIP-141: Segregated Witness](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki)
- [bitcoinjs-lib Documentation](https://github.com/bitcoinjs/bitcoinjs-lib)

---

## 📄 License

[Include your license here]

---

## 🤝 Contributing

This is a reference implementation. For bugs or improvements:

1. Open an issue describing the problem
2. Include steps to reproduce
3. Suggest a solution if possible

---

## ⚡ Next Steps

After understanding this example:

1. **Add persistence**: Implement encrypted database storage
2. **Add authentication**: JWT or session-based auth
3. **Enhance security**: HSM integration, key encryption
4. **Add Lightning**: Integrate LND or Core Lightning
5. **Build policies**: Multi-sig, spending limits, approval flows
6. **Add monitoring**: Transaction tracking, alert system

Remember: This is a foundation. Production wallets require significantly more security, testing, and operational considerations.
