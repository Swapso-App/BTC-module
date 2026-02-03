# Bitcoin BTC-Module

<div align="center">

![Bitcoin](https://bitcoin.org/img/icons/logotop.svg?1700824099)

**Enterprise-grade Bitcoin wallet infrastructure powering [Swapso Wallet](https://swapso.io)**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-14+-green.svg)](https://nodejs.org/)

</div>

---

## 🎯 Overview

**BTC-Module** is a production-ready, open-source Bitcoin wallet infrastructure library that powers the [Swapso Wallet](https://swapso.io) - a self-custody Bitcoin wallet with Lightning Network integration, educational modules, and Bitcoin purchasing features.

This module provides developers with robust tools for:
- **HD Wallet Creation** - Generate secure Bitcoin wallets using BIP32/BIP39 mnemonic phrases
- **Multi-Account Management** - Manage multiple Bitcoin accounts from a single seed
- **Transaction Management** - Build, sign, and broadcast Bitcoin transactions
- **Key Security** - Enterprise-grade encryption with AWS KMS support
- **Address Generation** - Support for all major Bitcoin address types

---

## ✨ Features

### 🔐 Wallet & Key Management
- **HD Wallet Generation** - BIP32/BIP39 compliant hierarchical deterministic wallets
- **Mnemonic Support** - 12-word mnemonic phrase generation and recovery
- **Multi-Account** - Create unlimited Bitcoin accounts from a single seed
- **Key Derivation** - Industry-standard key derivation paths for mainnet and testnet
- **Private Key Export** - Secure private key export functionality
- **Wallet Import** - Import existing wallets using private keys

### 💰 Transaction Handling
- **Transaction Building** - Construct Bitcoin transactions with proper UTXO management
- **Transaction Signing** - Sign transactions with ECDSA cryptography
- **Fee Calculation** - Optimal fee estimation based on network conditions
- **Transaction Broadcasting** - Send transactions to Bitcoin network
- **Balance Queries** - Check wallet balances on mainnet and testnet

### 🏷️ Address Support
- **P2PKH (Legacy)** - Traditional Bitcoin addresses starting with '1'
- **P2SH (SegWit)** - Pay-to-Script-Hash addresses starting with '3'
- **P2WPKH (Native SegWit)** - Native SegWit addresses starting with 'bc1q'
- **P2TR (Taproot)** - Taproot addresses starting with 'bc1p'
- **Address Validation** - Comprehensive address format validation

### 🔒 Security
- **AWS KMS Encryption** - Secure mnemonic storage with AWS Key Management Service
- **AES-256-GCM** - Military-grade encryption for sensitive data
- **secp256k1** - Industry-standard elliptic curve cryptography
- **Message Signing** - Bitcoin message signature verification
- **Network Separation** - Strict mainnet/testnet isolation

---

## 📦 Installation

### Prerequisites
- **Node.js** v14.0.0 or higher
- **npm** or **yarn** package manager
- **TypeScript** 4.0+ (for development)

### Install via npm
```bash
npm install btc-module
```

### Install via yarn
```bash
yarn add btc-module
```

### Clone & Build from Source
```bash
# Clone the repository
git clone https://github.com/Swapso-App/BTC-module.git
cd BTC-module

# Install dependencies
cd btc-controller
npm install

# Run tests
npm test
```

---

## 🚀 Quick Start

### Initialize Wallet Controller

```typescript
import { KeyringController } from 'btc-module';

// Create a new wallet
const bitcoinController = new KeyringController({
  mnemonic: 'your twelve word mnemonic phrase goes here for wallet recovery',
  network: 'MAINNET' // or 'TESTNET'
});
```

### Create Bitcoin Account

```typescript
// Generate a new Bitcoin address
const account = await bitcoinController.addAccount();
console.log('New address:', account.address);
// Output: bc1q...
```

### Send Bitcoin Transaction

```typescript
import { TransactionService } from 'btc-module';

const txService = new TransactionService(bitcoinController, 'MAINNET');

const transaction = await txService.executeTransaction({
  from: 'bc1q...sender',
  to: 'bc1q...receiver',
  amount: 50000, // satoshis
  satPerByte: 5, // fee rate
  networkType: 'MAINNET'
});

console.log('Transaction ID:', transaction.txId);
```

### Validate Bitcoin Address

```typescript
import { validateBitcoinAddress, getAddressType } from 'btc-module';

const isValid = validateBitcoinAddress('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
console.log('Valid:', isValid); // true

const type = getAddressType('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
console.log('Type:', type); // P2WPKH (Native Segwit)
```

### Check Balance

```typescript
import { getBalance } from 'btc-module';

const balance = await getBalance('bc1q...address', 'MAINNET');
console.log('Balance:', balance.balance, 'BTC');
```

---

## 📚 API Documentation

### KeyringController

Core wallet management controller for Bitcoin operations.

#### Constructor
```typescript
new KeyringController({
  mnemonic: string,      // 12-word BIP39 mnemonic
  network: string        // 'MAINNET' | 'TESTNET'
})
```

#### Methods

##### `addAccount()`
Generate a new Bitcoin account from the HD wallet.

```typescript
const account = await bitcoinController.addAccount();
// Returns: { address: string }
```

##### `getAccounts()`
Retrieve all accounts in the keyring.

```typescript
const accounts = await bitcoinController.getAccounts();
// Returns: string[] (array of addresses)
```

##### `exportPrivateKey(address)`
Export the private key for a specific address.

```typescript
const { privateKey } = await bitcoinController.exportPrivateKey('bc1q...');
// Returns: { privateKey: string }
```

##### `importWallet(privateKey)`
Import an existing wallet using a private key.

```typescript
const address = await bitcoinController.importWallet('privateKeyHex');
// Returns: string (Bitcoin address)
```

##### `signTransaction(txParams)`
Sign a Bitcoin transaction.

```typescript
const { signedTransaction } = await bitcoinController.signTransaction({
  from: 'bc1q...sender',
  to: 'bc1q...receiver',
  amount: 50000,
  satPerByte: 5
});
// Returns: { signedTransaction: string }
```

##### `signMessage(message, address)`
Sign a message with Bitcoin address.

```typescript
const { signature } = await bitcoinController.signMessage(
  'Hello Bitcoin!',
  'bc1q...address'
);
// Returns: { signature: string }
```

##### `getFees(rawTransaction)`
Calculate transaction fees.

```typescript
const fees = await bitcoinController.getFees(rawTx);
// Returns: fee information
```

### TransactionService

High-level transaction management service.

#### Constructor
```typescript
new TransactionService(
  keyringController: KeyringController,
  networkType: 'MAINNET' | 'TESTNET'
)
```

#### Methods

##### `executeTransaction(params)`
Execute a complete Bitcoin transaction.

```typescript
const result = await txService.executeTransaction({
  from: string,
  to: string,
  amount: number,        // satoshis
  satPerByte: number,    // fee rate
  networkType: string
});
// Returns: { success: boolean, txId: string, message: string }
```

##### `getAccountBalance(address)`
Fetch account balance.

```typescript
const balance = await txService.getAccountBalance('bc1q...');
// Returns: string (balance in BTC)
```

### Utility Functions

#### `validateBitcoinAddress(address)`
Validate Bitcoin address format.

```typescript
import { validateBitcoinAddress } from 'btc-module';
const isValid = validateBitcoinAddress('bc1q...');
// Returns: boolean
```

#### `getAddressType(address)`
Get Bitcoin address type.

```typescript
import { getAddressType } from 'btc-module';
const type = getAddressType('bc1q...');
// Returns: 'P2PKH (Legacy)' | 'P2SH (Segwit)' | 'P2WPKH (Native Segwit)' | 'P2TR (Taproot)'
```

#### `getBalance(address, network)`
Query Bitcoin address balance.

```typescript
import { getBalance } from 'btc-module';
const balance = await getBalance('bc1q...', 'MAINNET');
// Returns: { balance: string }
```

### Mnemonic Encryption (AWS KMS)

#### `encryptMnemonic()`
Encrypt mnemonic using AWS KMS.

```typescript
import { encryptMnemonic } from 'btc-module/mnemonic';

const encrypted = await encryptMnemonic();
// Returns: {
//   encryptedMnemonic: string,
//   iv: string,
//   authTag: string,
//   encryptedDataKey: string
// }
```

#### `decryptMnemonic(encryptedData)`
Decrypt mnemonic using AWS KMS.

```typescript
import { decryptMnemonic } from 'btc-module/mnemonic';

const mnemonic = await decryptMnemonic({
  encryptedMnemonic: '...',
  iv: '...',
  authTag: '...',
  encryptedDataKey: '...'
});
// Returns: string (decrypted mnemonic)
```

---

## 🏗️ Project Structure

```
BTC-module/
├── btc-controller/           # Core Bitcoin wallet controller
│   ├── src/
│   │   ├── index.ts         # KeyringController implementation
│   │   ├── config/          # Network configurations
│   │   ├── helper/          # Transaction & signing helpers
│   │   │   ├── signTransaction.ts
│   │   │   ├── calculateFeeAndInput.ts
│   │   │   └── utils/       # Address generation, key derivation
│   │   └── test/            # Unit & integration tests
├── mnemonic/                # Mnemonic encryption/decryption
│   ├── index.ts            # AWS KMS integration
│   └── index_old.ts        # Legacy encryption
├── bitcoinValidation.ts     # Address validation utilities
├── transactionService.ts    # High-level transaction service
├── CONTRIBUTING.md          # Contribution guidelines
├── IDEAS.md                 # GSoC project ideas
└── LICENSE                  # MIT License
```

---

## 🔧 Configuration

### Environment Variables

For AWS KMS encryption (optional):

```bash
# AWS KMS Configuration
WALLET_KMS_AWS_REGION=us-east-1
WALLET_KMS_AWS_ACCESS_KEY_ID=your_access_key
WALLET_KMS_AWS_SECRET_ACCESS_KEY=your_secret_key
WALLET_KMS_KEY_ID=your_kms_key_id
```

### Network Configuration

The module supports both Bitcoin mainnet and testnet:

```typescript
// Mainnet (default)
const mainnetWallet = new KeyringController({
  mnemonic: 'your mnemonic',
  network: 'MAINNET'
});

// Testnet
const testnetWallet = new KeyringController({
  mnemonic: 'your mnemonic',
  network: 'TESTNET'
});
```

---

## 🧪 Testing

```bash
cd btc-controller
npm test
```

### Run Specific Tests
```bash
npm test -- --grep "KeyringController"
```

### Test Coverage
```bash
npm run test:coverage
```

---

## 🤝 Contributing

We welcome contributions from developers of all skill levels! Whether you're fixing bugs, adding features, or improving documentation, your contributions are valuable.

### Getting Started
1. Read our [**Contributor Guide**](CONTRIBUTING.md) for detailed guidelines
2. Check out [**Project Ideas**](IDEAS.md) for inspiration on what to work on
3. Browse [GitHub Issues](https://github.com/Swapso-App/BTC-module/issues) for open tasks
4. Join discussions and ask questions
5. Submit a PR following our code style

### Ways to Contribute
- 🐛 **Report Bugs** - Found an issue? Let us know!
- ✨ **Add Features** - Implement new functionality
- 📝 **Improve Docs** - Help others understand the codebase
- 🧪 **Write Tests** - Increase test coverage
- 🔍 **Code Review** - Review pull requests
- 💡 **Share Ideas** - Suggest improvements

### Development Setup
```bash
# Fork & clone the repository
git clone https://github.com/YOUR_USERNAME/BTC-module.git

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes and commit
git commit -m "feat: add new feature"

# Push and create a PR
git push origin feature/your-feature-name
```

---

## 🌟 Use Cases

### 1. Self-Custody Wallets
Build non-custodial Bitcoin wallets where users control their private keys.

### 2. Lightning Network Applications
Integrate with Lightning Network for instant, low-cost Bitcoin transactions.

### 3. Bitcoin Payment Processors
Accept Bitcoin payments with automatic transaction handling.

### 4. Multi-Signature Security
Implement enterprise-grade multi-signature wallet solutions (coming soon).

### 5. Hardware Wallet Integration
Connect with Ledger and Trezor devices for enhanced security (roadmap).

---

## 📖 Resources

### Bitcoin Standards
- [BIP32 - HD Wallets](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
- [BIP39 - Mnemonic Phrases](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [BIP44 - Multi-Account Hierarchy](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)

### Documentation
- [Bitcoin Developer Guide](https://developer.bitcoin.org/)
- [Bitcoin Transactions Explained](https://en.bitcoin.it/wiki/Transaction)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Libraries Used
- [bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib) - Bitcoin protocol implementation
- [bip32](https://github.com/bitcoinjs/bip32) - HD key derivation
- [bip39](https://github.com/bitcoinjs/bip39) - Mnemonic generation
- [ecpair](https://github.com/bitcoinjs/ecpair) - Key pair management
- [@bitcoinerlab/secp256k1](https://github.com/bitcoinerlab/secp256k1) - Cryptographic operations

---

## 🗺️ Roadmap

### ✅ Current Features (v1.0)
- [x] HD wallet generation (BIP32/BIP39)
- [x] Multi-account management
- [x] Transaction signing & broadcasting
- [x] AWS KMS encryption
- [x] All address type support
- [x] Balance queries

### 🚧 In Progress (v1.1)
- [ ] Multi-signature wallet support (BIP45)
- [ ] Hardware wallet integration (Ledger/Trezor)
- [ ] Partially Signed Bitcoin Transactions (PSBT)
- [ ] Enhanced fee estimation

### 🔮 Planned (v2.0)
- [ ] Lightning Network integration
- [ ] Coin control & UTXO management
- [ ] Watch-only wallet support
- [ ] Batch transaction processing
- [ ] Transaction history & indexing

---

## 💼 About Swapso

**Swapso** is a self-custody Bitcoin wallet designed to make Bitcoin accessible, educational, and easy to use.

### Features
- 💰 **Self-Custody Wallet** - Full control of your Bitcoin
- ⚡ **Lightning Network** - Instant, low-fee transactions
- 🔄 **Bitcoin-Lightning Swap** - Seamless conversion between on-chain and Lightning
- 📚 **Educational Modules** - Learn Bitcoin fundamentals
- 🛒 **Buy Bitcoin** - Purchase Bitcoin directly in-app

**Website:** [swapso.io](https://swapso.io)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 SwapSo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 👥 Team & Mentors

### Lead Mentor
- **Suraj Singla** - [@surajsingla333](https://github.com/surajsingla333)

### Mentors
- **Aditya Ranjan** - [@adityaranjan2005](https://github.com/adityaranjan2005) | [@em_adii](https://x.com/em_adii)
  - Email: aditya@swapso.io
- **Aayush Pandey** - [@Hsuyaa4518](https://github.com/Hsuyaa4518)
- **Karan Gill** - [@krn-gill](https://github.com/krn-gill)

---

## 🙏 Acknowledgments

Special thanks to:
- The Bitcoin development community
- Contributors to bitcoinjs-lib and related libraries
- Google Summer of Code program
- All open-source contributors

---

## 📞 Support & Community

- **Issues:** [GitHub Issues](https://github.com/Swapso-App/BTC-module/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Swapso-App/BTC-module/discussions)
- **Email:** aditya@swapso.io
- **Twitter:** [@em_adii](https://x.com/em_adii)

---

<div align="center">

**Made with ❤️ by the Swapso Team**

[Website](https://swapso.io) • [GitHub](https://github.com/Swapso-App) • [Documentation](https://github.com/Swapso-App/BTC-module/wiki)

⭐ **Star us on GitHub if you find this project useful!** ⭐

</div>
