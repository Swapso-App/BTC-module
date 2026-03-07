export declare const bitcoin: {
    HD_PATH_MAINNET: string;
    HD_PATH_TESTNET: string;
};
export declare const bitcoin_transaction: {
    NATIVE_TRANSFER: string;
};
export declare const bitcoin_network: {
    readonly MAINNET: {
        readonly NETWORK: "MAINNET";
        readonly ADDRESS: 0;
    };
    readonly TESTNET: {
        readonly NETWORK: "TESTNET";
        readonly ADDRESS: 111;
    };
};
export type BitcoinNetworkName = (typeof bitcoin_network)[keyof typeof bitcoin_network]["NETWORK"];
export type SOCHAIN_API_HEADER = {
    "API-KEY": string;
};
