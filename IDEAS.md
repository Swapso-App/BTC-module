# GSoC 2026 Ideas List - Bitcoin BTC-Module

Welcome! This is the official ideas list for Bitcoin BTC-Module. Below are project ideas suitable for Google Summer of Code 2026 contributions.

---

## Idea 1: Enhanced Multi-Signature Transaction Support

**Difficulty Level:** Medium  
**Expected Hours:** 175  
**Skills Required:** TypeScript, Bitcoin Cryptography, BIP45/BIP48  
**Mentors:** Suraj Singla, Aditya Ranjan, Aayush Pandey

### Description
Extend the current Bitcoin BTC-Module to support Multi-Signature (m-of-n) transactions. Currently, the module only handles single-signature transactions. This project will implement full multi-signature support, allowing users to create wallets that require multiple private keys to authorize transactions, significantly improving security for institutional use cases.

### Goals
- [ ] Implement BIP45 Multi-Account Hierarchy derivation
- [ ] Create `createMultiSigAddress()` function for m-of-n address generation
- [ ] Build `signMultiSigTransaction()` with support for partial signing and signature collection
- [ ] Add comprehensive test coverage for multi-sig scenarios
- [ ] Write documentation and examples for multi-sig workflows

### Getting Started
1. Review [BIP45 specification](https://github.com/bitcoin/bips/blob/master/bip-0045.mediawiki)
2. Study existing code in [src/helper/signTransaction.ts](btc-controller/src/helper/signTransaction.ts)
3. Examine current key derivation in [src/helper/utils/calcBip32ExtendedKeys.ts](btc-controller/src/helper/utils/calcBip32ExtendedKeys.ts)
4. Check test examples in [test/index.js](btc-controller/test/index.js)

### Resources
- [bitcoinjs-lib Multi-Sig Examples](https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts)
- [BIP45 specification](https://github.com/bitcoin/bips/blob/master/bip-0045.mediawiki)
- [Bitcoin Multisig Guide](https://en.bitcoin.it/wiki/Multisignature)
- Current implementation: [src/index.ts](btc-controller/src/index.ts)

---

## Idea 2: Hardware Wallet Integration (Ledger & Trezor)

**Difficulty Level:** Hard  
**Expected Hours:** 350  
**Skills Required:** TypeScript, Bitcoin, Hardware Wallet Protocols, USB Communication  
**Mentors:** Aditya Ranjan, Suraj Singla, Aayush Pandey, Karan Gill

### Description
Integrate support for hardware wallets (Ledger Nano S/X and Trezor Model T) into the BTC-Module. This will allow users to keep their private keys secured on hardware devices while still being able to sign transactions through the controller. This is critical for institutional-grade security.

### Goals
- [ ] Implement Ledger hardware wallet connection via `@ledgerhq/hw-app-btc`
- [ ] Implement Trezor hardware wallet support via `trezor.js`
- [ ] Create unified `HardwareWalletController` interface compatible with existing `KeyringController`
- [ ] Build address derivation and verification flow
- [ ] Add transaction signing through hardware device
- [ ] Create comprehensive error handling for disconnections

### Getting Started
1. Study existing KeyringController: [src/index.ts](btc-controller/src/index.ts)
2. Understand current signing flow: [src/helper/signTransaction.ts](btc-controller/src/helper/signTransaction.ts)
3. Review BIP44 derivation: [src/helper/utils/calcBip32ExtendedKeys.ts](btc-controller/src/helper/utils/calcBip32ExtendedKeys.ts)
4. Check existing configuration: [src/config/index.ts](btc-controller/src/config/index.ts)

### Resources
- [Ledger Hardware App Bitcoin](https://github.com/LedgerHQ/app-bitcoin)
- [Trezor Integration Guide](https://docs.trezor.io/trezor-firmware/core/app-bitcoin.html)
- [Hardware Wallet Security Best Practices](https://en.bitcoin.it/wiki/Hardware_wallet)

---

## Idea 3: Advanced Fee Estimation Engine with ML Predictions

**Difficulty Level:** Medium  
**Expected Hours:** 175  
**Skills Required:** TypeScript, ML/Statistical Analysis, Bitcoin Mempool Data  
**Mentors:** Aditya Ranjan, Suraj Singla, Aayush Pandey, Karan Gill

### Description
Improve the current fee calculation mechanism in [src/helper/calculateFeeAndInput.ts](btc-controller/src/helper/calculateFeeAndInput.ts) by implementing machine learning-based fee estimation. The new system will predict optimal fees based on network conditions, historical data, and transaction priority, replacing static fee calculations.

### Goals
- [ ] Implement mempool-based fee rate analysis
- [ ] Create ML model for fee prediction (lightweight model for production)
- [ ] Add dynamic fee tier selection (low/medium/high/custom)
- [ ] Build fee rate caching and update mechanism
- [ ] Create visualization of fee estimates over time
- [ ] Comprehensive testing against historical mempool data

### Getting Started
1. Review current fee calculation: [src/helper/calculateFeeAndInput.ts](btc-controller/src/helper/calculateFeeAndInput.ts)
2. Study transaction service: [transactionService.ts](transactionService.ts)
3. Understand Bitcoin mempool concepts
4. Research fee estimation algorithms

### Resources
- [Mempool.space API](https://mempool.space/docs/api)
- [Bitcoin Fee Estimation](https://en.bitcoin.it/wiki/Miner_fees)
- [Current Implementation Analysis](btc-controller/src/helper/calculateFeeAndInput.ts)

---

## Idea 4: Real-Time Address Monitoring & Balance Dashboard

**Difficulty Level:** Medium  
**Expected Hours:** 175  
**Skills Required:** TypeScript, React/Vue.js, WebSockets, Real-time Data Visualization  
**Mentors:** Aditya Ranjan, Suraj Singla, Aayush Pandey, Karan Gill

### Description
Create a web-based dashboard that monitors Bitcoin addresses in real-time. Users can add addresses they want to track, and the dashboard will display live balance updates, incoming/outgoing transactions, and historical transaction data with beautiful visualizations.

### Goals
- [ ] Build address monitoring system with WebSocket support
- [ ] Create React/Vue dashboard UI for address tracking
- [ ] Implement real-time balance updates
- [ ] Add transaction history and filtering
- [ ] Build address statistics and charts
- [ ] Add export functionality (CSV, JSON)

### Getting Started
1. Review balance checking: [src/index.ts](btc-controller/src/index.ts) - `getBalance()` function
2. Study address validation: [bitcoinValidation.ts](bitcoinValidation.ts)
3. Check existing helper functions: [src/helper/index.ts](btc-controller/src/helper/index.ts)
4. Research blockchain APIs

### Resources
- [Blockchain.com API](https://www.blockchain.com/api)
- [Mempool.space API](https://mempool.space/docs/api)
- [Chart.js for Visualizations](https://www.chartjs.org/)
- Balance tracking: [src/index.ts](btc-controller/src/index.ts)

---

## Idea 5: Transaction Analysis & Visualization Tool

**Difficulty Level:** Easy  
**Expected Hours:** 90  
**Skills Required:** TypeScript, Graph Visualization, Bitcoin Protocol  
**Mentors:** Aditya Ranjan, Suraj Singla, Aayush Pandey, Karan Gill

### Description
Build a tool that parses and visualizes Bitcoin transactions. Given a transaction hash, the tool will display transaction details (inputs, outputs, fees, timing) in an easy-to-understand visual format. Includes transaction tracing to identify coin flow paths.

### Goals
- [ ] Create transaction parser from blockchain data
- [ ] Build transaction visualization UI (inputs → outputs)
- [ ] Implement coin flow tracing across transactions
- [ ] Add transaction detail display and analysis
- [ ] Create UTXO tracking visualization
- [ ] Add export and reporting features

### Getting Started
1. Study transaction service: [transactionService.ts](transactionService.ts)
2. Review address validation logic: [bitcoinValidation.ts](bitcoinValidation.ts)
3. Check helper functions: [src/helper/index.ts](btc-controller/src/helper/index.ts)
4. Understand UTXO model

### Resources
- [Bitcoin UTXO Model](https://en.bitcoin.it/wiki/Unspent_transaction_output)
- [Blockchair API](https://blockchair.com/api)
- [Vis.js Graph Library](https://visjs.org/)

---

## Idea 6: Offline Transaction Signing (Air-Gapped Security)

**Difficulty Level:** Hard  
**Expected Hours:** 350  
**Skills Required:** TypeScript, Cryptography, QR Codes, Bitcoin Security  
**Mentors:** Aditya Ranjan, Suraj Singla, Aayush Pandey, Karan Gill

### Description
Implement an air-gapped offline transaction signing system. This allows creating and signing transactions on an offline machine, then broadcasting on an online machine, maximizing security. Include QR code encoding/decoding for transaction transfer between air-gapped and online systems.

### Goals
- [ ] Create offline transaction builder
- [ ] Implement BIP32 extended public key export
- [ ] Build QR code encoding for transaction data
- [ ] Create offline signing interface
- [ ] Implement secure transaction serialization
- [ ] Build air-gap protocol documentation and examples

### Getting Started
1. Study key derivation: [src/helper/utils/calcBip32ExtendedKeys.ts](btc-controller/src/helper/utils/calcBip32ExtendedKeys.ts)
2. Review signing mechanism: [src/helper/signTransaction.ts](btc-controller/src/helper/signTransaction.ts)
3. Check KeyringController: [src/index.ts](btc-controller/src/index.ts)
4. Research offline security best practices

### Resources
- [BIP32 Specification](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
- [Air-Gapped Security Guide](https://en.bitcoin.it/wiki/Air_gap)
- [QR Code Library (qrcode.js)](https://davidshimjs.github.io/qrcodejs/)
- Current signing: [src/helper/signTransaction.ts](btc-controller/src/helper/signTransaction.ts)

---

## Idea 7: PSBT (Partially Signed Bitcoin Transaction) Full Implementation

**Difficulty Level:** Medium  
**Expected Hours:** 175  
**Skills Required:** TypeScript, Bitcoin Protocol, BIP174  
**Mentors:** Aditya Ranjan, Suraj Singla, Aayush Pandey, Karan Gill

### Description
Implement complete BIP174 (Partially Signed Bitcoin Transaction) support in the BTC-Module. PSBTs are the standard for passing transaction signing between devices and services. This enables better interoperability with other Bitcoin tools and hardware wallets.

### Goals
- [ ] Implement PSBT creation from unsigned transactions
- [ ] Build PSBT parsing and validation
- [ ] Create partial signing functionality
- [ ] Implement PSBT finalization and broadcast
- [ ] Add PSBT serialization/deserialization (hex, base64)
- [ ] Write comprehensive test suite and examples

### Getting Started
1. Review current transaction building: [src/index.ts](btc-controller/src/index.ts)
2. Study helper utilities: [src/helper/index.ts](btc-controller/src/helper/index.ts)
3. Review signing flow: [src/helper/signTransaction.ts](btc-controller/src/helper/signTransaction.ts)
4. Understand BIP174 standard

### Resources
- [BIP174 - Partially Signed Bitcoin Transaction](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki)
- [bitcoinjs-lib PSBT Support](https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/ts_src/psbt.ts)
- [PSBT Library (psbtjs)](https://github.com/caravan/caravan)
- Current transaction handling: [transactionService.ts](transactionService.ts)

---

## Contribution Guidelines

### Before You Start:
1. Fork the repository: [BTC-Module GitHub](https://github.com/yourusername/BTC-module)
2. Read [btc-controller/README.md](btc-controller/README.md)
3. Set up development environment
4. Review existing tests in [test/](btc-controller/test/)

### During Development:
- Write tests for all new functionality
- Follow existing TypeScript/code style
- Keep commits atomic and well-documented
- Regular communication with mentors

### Submission Checklist:
- [ ] Code follows project style guide
- [ ] All tests pass locally
- [ ] Documentation is complete
- [ ] PR description clearly explains changes
- [ ] No breaking changes without discussion

---

## Contact & Questions

Have questions about any of these ideas? Feel free to:
- Open an issue in the repository
- Contact mentors:
  - **Aditya Ranjan** - [GitHub](https://github.com/adityaranjan2005) | Email: aditya@swapso.io | [X/Twitter](https://x.com/em_adii)
  - **Suraj Singla** - [GitHub](https://github.com/surajsingla333)
  - **Aayush Pandey** - [GitHub](https://github.com/Hsuyaa4518)
  - **Karan Gill** - [GitHub](https://github.com/krn-gill)
- Check the [README.md](btc-controller/README.md) for more context

**Good luck! We look forward to your contributions! 🚀**
