import { BitcoinNetworkName } from "./config/index";
export { TransactionVisualizer } from "./helper/transactionVisualizer";
export { buildMultiSigTransaction } from "./helper/buildMultiSigTransaction";
export declare class KeyringController {
    bip32: any;
    ECPair: any;
    store: any;
    importedWallets: any;
    constructor(opts: any);
    private derivedChild;
    private toHexString;
    private toByteArray;
    generateWallet(): any;
    addAccount(): Promise<{
        address: string;
    }>;
    getAccounts(): Promise<any>;
    exportPrivateKey(_address: string): Promise<{
        privateKey: string;
    }>;
    importWallet(_privateKey: string): Promise<string>;
    fetchFreshUtxos(address: string, networkType: string): Promise<any[]>;
    signTransaction(transaction: any): Promise<{
        signedTransaction: string;
    }>;
    signMessage(message: string, _address: string, privateKey?: any): Promise<{
        signedMessage: string;
    }>;
    sendTransaction(TransactionHex: string): Promise<{
        transactionDetails: any;
    }>;
    getFees(rawTransaction: any): Promise<{
        transactionSize: number;
        fees: {
            slow: {
                satPerByte: number;
            };
            standard: {
                satPerByte: number;
            };
            fast: {
                satPerByte: number;
            };
        };
    }>;
    persistAllAddress(_address: string): boolean;
    updatePersistentStore(obj: object): boolean;
}
export declare const getBalance: (address: string, networkType: BitcoinNetworkName) => Promise<{
    balance: any;
}>;
