import { KeyringController } from './btc-controller/src';
import { getBalance } from './btc-controller/src';

interface TransactionParams {
  from: string;
  to: string;
  amount: number;
  satPerByte: number;
  networkType: string;  // 'MAINNET' or 'TESTNET'
}

export class TransactionService {
  private keyringController: KeyringController;
  private networkType: 'MAINNET' | 'TESTNET';

  constructor(keyringController: KeyringController, networkType: string) {
    this.keyringController = keyringController;
    if (networkType !== 'MAINNET' && networkType !== 'TESTNET') {
      throw new Error("Invalid network type. Must be 'MAINNET' or 'TESTNET'.");
    }
    this.networkType = networkType as 'MAINNET' | 'TESTNET';
  }

  async executeTransaction(params: TransactionParams) {
    try {
      // Get balance using the imported getBalance function
      const balanceResponse = await getBalance(params.from, this.networkType);
      const currentBalance = parseFloat(balanceResponse.balance);

      if (currentBalance < params.amount) {
        throw new Error('Insufficient balance');
      }

      // Creating transaction object
      const transaction = {
        from: params.from,
        to: params.to,
        amount: params.amount,
        satPerByte: params.satPerByte
      };

      // Sign the transaction
      const { signedTransaction } = await this.keyringController.signTransaction(transaction);

      // Broadcast the transaction
      const { transactionDetails } = await this.keyringController.sendTransaction(signedTransaction);

      return {
        success: true,
        txId: transactionDetails,
        message: 'Transaction successful'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Transaction failed'
      };
    }
  }

  async getAccountBalance(address: string): Promise<string> {
    try {
      const { balance } = await getBalance(address, this.networkType);
      return balance;
    } catch (error) {
      throw new Error('Failed to fetch balance');
    }
  }
}