interface UTXO {
  txid: string;
  vout: number;
  value: number;
  confirmations: number;
  scriptPubKey?: {
    type: string;
    addresses?: string[];
  };
}

interface TransactionSizeEstimate {
  size: number;
  weight: number;
  vBytes: number;
  inputCount: number;
  outputCount: number;
  inputTypes: string[];
}

class BitcoinTransactionSizeCalculator {
  
  static getAddressType(address: string): string {
    if (address.startsWith('bc1q') && address.length === 42) return 'P2WPKH';
    if (address.startsWith('bc1p') && address.length === 62) return 'P2TR';
    if (address.startsWith('3')) return 'P2SH';
    if (address.startsWith('1')) return 'P2PKH';
    if (address.startsWith('bc1') && address.length > 42) return 'P2WSH';
    return 'UNKNOWN';
  }

  // Input size calculations (in weight units)
  static getInputWeight(addressType: string): number {
    const weights = {
      'P2PKH': 592,      // Legacy: 148 * 4
      'P2SH': 640,       // Script hash: 160 * 4  
      'P2WPKH': 272,     // Native segwit: 68 * 4
      'P2WSH': 272,      // Native segwit script: 68 * 4
      'P2TR': 230,       // Taproot: 57.5 * 4
      'UNKNOWN': 592     // Conservative fallback
    };
    return weights[addressType] || weights['UNKNOWN'];
  }

  // Output size calculations (in weight units)
  static getOutputWeight(addressType: string): number {
    const weights = {
      'P2PKH': 136,      // Legacy: 34 * 4
      'P2SH': 128,       // Script hash: 32 * 4
      'P2WPKH': 124,     // Native segwit: 31 * 4
      'P2WSH': 172,      // Native segwit script: 43 * 4
      'P2TR': 172,       // Taproot: 43 * 4
      'UNKNOWN': 136     // Conservative fallback
    };
    return weights[addressType] || weights['UNKNOWN'];
  }

  // Main transaction size estimation function
  static estimateTransactionSize(
    utxos: UTXO[], 
    outputCount: number = 2,
    senderAddress?: string
  ): TransactionSizeEstimate {
    
    if (!utxos || utxos.length === 0) {
      // Fallback estimation
      return {
        size: 140,
        weight: 560,
        vBytes: 140,
        inputCount: 1,
        outputCount: 2,
        inputTypes: ['P2WPKH']
      };
    }

    const inputCount = utxos.length;
    let totalWeight = 0;
    const inputTypes: string[] = [];

    // Transaction overhead (version + locktime + input/output counts)
    totalWeight += 40; // 10 bytes * 4

    // Calculate input weights
    for (const utxo of utxos) {
      let addressType = 'P2WPKH'; // Default assumption
      
      // Trying to determine address type from scriptPubKey or addresses
      if (utxo.scriptPubKey?.addresses?.[0]) {
        addressType = this.getAddressType(utxo.scriptPubKey.addresses[0]);
      } else if (senderAddress) {
        addressType = this.getAddressType(senderAddress);
      }
      
      inputTypes.push(addressType);
      totalWeight += this.getInputWeight(addressType);
    }

    // Calculate output weights (assume recipient gets same type as sender)
    const outputType = senderAddress ? this.getAddressType(senderAddress) : 'P2WPKH';
    totalWeight += outputCount * this.getOutputWeight(outputType);

    // Convert weight to virtual bytes (rounded up)
    const vBytes = Math.ceil(totalWeight / 4);
    const size = Math.ceil(totalWeight / 4); // Approximate size

    return {
      size,
      weight: totalWeight,
      vBytes,
      inputCount,
      outputCount,
      inputTypes
    };
  }

  // FIXED: More robust UTXO selection with consistent fee calculation
  static selectOptimalUTXOs(utxos: UTXO[], targetAmount: number, feeRate: number, senderAddress?: string): {
    selectedUTXOs: UTXO[];
    totalInput: number;
    estimatedFee: number;
    changeAmount: number;
    finalOutputCount: number;
  } {
    if (!utxos || utxos.length === 0) {
      throw new Error('No UTXOs available - wallet may be empty or all funds already spent');
    }

    const sortedUTXOs = [...utxos].sort((a, b) => b.value - a.value);
    
    let selectedUTXOs: UTXO[] = [];
    let totalInput = 0;

    for (const utxo of sortedUTXOs) {
      selectedUTXOs.push(utxo);
      totalInput += utxo.value;

      // CRITICAL FIX: Calculate fee for both scenarios (with and without change)
      
      // Scenario 1: With change output (2 outputs)
      const estimateWithChange = this.estimateTransactionSize(selectedUTXOs, 2, senderAddress);
      const feeWithChange = Math.ceil(estimateWithChange.vBytes * feeRate);
      const changeWithChange = totalInput - targetAmount - feeWithChange;
      
      // Scenario 2: Without change output (1 output) - if change would be dust
      const estimateWithoutChange = this.estimateTransactionSize(selectedUTXOs, 1, senderAddress);
      const feeWithoutChange = Math.ceil(estimateWithoutChange.vBytes * feeRate);
      const changeWithoutChange = totalInput - targetAmount - feeWithoutChange;

      // Decide which scenario to use
      let finalFee: number;
      let finalChange: number;
      let finalOutputCount: number;

      if (changeWithChange >= 546) { // Bitcoin dust threshold is 546 sats, not 100
        // Use change output scenario
        finalFee = feeWithChange;
        finalChange = changeWithChange;
        finalOutputCount = 2;
      } else {
        // Use no-change scenario (dust becomes extra fee)
        finalFee = feeWithoutChange;
        finalChange = 0;
        finalOutputCount = 1;
      }

      console.log(`💰 UTXO Selection Debug:
        - Selected UTXOs: ${selectedUTXOs.length}
        - Total input: ${totalInput} sats
        - Target amount: ${targetAmount} sats
        - Fee (${finalOutputCount} outputs): ${finalFee} sats
        - Change: ${finalChange} sats
        - vBytes: ${finalOutputCount === 2 ? estimateWithChange.vBytes : estimateWithoutChange.vBytes}
        - Fee rate: ${feeRate} sat/vB`);

      // Check if we have enough funds
      if (totalInput >= targetAmount + finalFee) {
        return {
          selectedUTXOs,
          totalInput,
          estimatedFee: finalFee,
          changeAmount: finalChange,
          finalOutputCount
        };
      }
    }

    // Calculate what we actually need vs what we have
    const estimateForAll = this.estimateTransactionSize(selectedUTXOs, 1, senderAddress);
    const minFeeNeeded = Math.ceil(estimateForAll.vBytes * feeRate);
    const totalNeeded = targetAmount + minFeeNeeded;

    throw new Error(`Insufficient funds. Need ${totalNeeded} sats (${targetAmount} + ${minFeeNeeded} fee), have ${totalInput} sats`);
  }

  // FIXED: Simplified and more consistent fee calculation
  static async calculateOptimalFee(
    senderAddress: string,
    targetAmount: number,
    feeRate: number,
    utxos?: UTXO[]
  ): Promise<{
    fee: number;
    feeInSats: number;
    transactionSize: number;
    selectedUTXOs: UTXO[];
    changeAmount: number;
  }> {
    if (!utxos) {
      throw new Error('UTXOs required for accurate fee calculation');
    }

    if (utxos.length === 0) {
      const estimatedSize = this.estimateTransactionSize([], 2, senderAddress);
      const estimatedFeeInSats = Math.ceil(estimatedSize.vBytes * feeRate);
      return {
        fee: estimatedFeeInSats / 1e8,
        feeInSats: estimatedFeeInSats,
        transactionSize: estimatedSize.vBytes,
        selectedUTXOs: [],
        changeAmount: 0
      };
    }

    try {
      const selection = this.selectOptimalUTXOs(utxos, targetAmount, feeRate, senderAddress);
      
      // CRITICAL: Use the SAME calculation logic as selectOptimalUTXOs
      const finalSize = this.estimateTransactionSize(
        selection.selectedUTXOs,
        selection.finalOutputCount,
        senderAddress
      );

      // CRITICAL: Use Math.ceil to ensure we never underpay
      const finalFeeInSats = Math.ceil(finalSize.vBytes * feeRate);
      
      // Add small buffer to prevent edge cases (optional but recommended)
      const bufferedFeeInSats = finalFeeInSats + 1; // Add 1 sat buffer
      
      console.log(`🔥 Final Fee Calculation:
        - Transaction size: ${finalSize.vBytes} vBytes
        - Fee rate: ${feeRate} sat/vB
        - Calculated fee: ${finalFeeInSats} sats
        - Buffered fee: ${bufferedFeeInSats} sats
        - Output count: ${selection.finalOutputCount}`);

      return {
        fee: bufferedFeeInSats / 1e8,
        feeInSats: bufferedFeeInSats,
        transactionSize: finalSize.vBytes,
        selectedUTXOs: selection.selectedUTXOs,
        changeAmount: selection.changeAmount
      };
    } catch (error) {
      console.error('Fee calculation error:', error);
      throw error;
    }
  }

  static convertAmount(amount: number, fromUnit: string, toUnit: string): number {
    const btcAmount = fromUnit === 'sats' ? amount / 1e8 : amount;
    return toUnit === 'sats' ? btcAmount * 1e8 : btcAmount;
  }

  static formatFeeDisplay(feeInSats: number, feeRate: number, vBytes: number): string {
    const feeInBTC = (feeInSats / 1e8).toFixed(8);
    return `${feeInSats} sats (${feeInBTC} BTC) • ${feeRate} sat/vB • ${vBytes} vBytes`;
  }
}

export default BitcoinTransactionSizeCalculator;
