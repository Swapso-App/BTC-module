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
declare class BitcoinTransactionSizeCalculator {
    static getAddressType(address: string): string;
    static getInputWeight(addressType: string): number;
    static getOutputWeight(addressType: string): number;
    static estimateTransactionSize(utxos: UTXO[], outputCount?: number, senderAddress?: string): TransactionSizeEstimate;
    static selectOptimalUTXOs(utxos: UTXO[], targetAmount: number, feeRate: number, senderAddress?: string): {
        selectedUTXOs: UTXO[];
        totalInput: number;
        estimatedFee: number;
        changeAmount: number;
        finalOutputCount: number;
    };
    static calculateOptimalFee(senderAddress: string, targetAmount: number, feeRate: number, utxos?: UTXO[]): Promise<{
        fee: number;
        feeInSats: number;
        transactionSize: number;
        selectedUTXOs: UTXO[];
        changeAmount: number;
    }>;
    static convertAmount(amount: number, fromUnit: string, toUnit: string): number;
    static formatFeeDisplay(feeInSats: number, feeRate: number, vBytes: number): string;
}
export default BitcoinTransactionSizeCalculator;
