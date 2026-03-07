import { BitcoinNetworkName } from "../config";
export declare function getTransactionSize(address: string, network: BitcoinNetworkName): Promise<{
    transactionSize: number;
    totalAmountAvailable: number;
    inputs: any;
}>;
export declare function getFeeAndInput(address: string, network: BitcoinNetworkName, satPerByte: number): Promise<{
    totalAmountAvailable: number;
    inputs: any;
    fee: number;
    transactionSize: number;
}>;
