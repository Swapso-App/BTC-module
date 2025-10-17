export const bitcoin = {
  HD_PATH_MAINNET: `m/84'/0'/0'/0`,
  HD_PATH_TESTNET: `m/84'/1'/0'/0`,
};

export const bitcoin_transaction = {
  NATIVE_TRANSFER: "NATIVE_TRANSFER",
};

export const bitcoin_network = {
  MAINNET: {
    NETWORK: "MAINNET",
    ADDRESS: 0x00,
  },
  TESTNET: {
    NETWORK: "TESTNET",
    ADDRESS: 0x6f,
  },
} as const;

export type BitcoinNetworkName =
  (typeof bitcoin_network)[keyof typeof bitcoin_network]["NETWORK"];

export type SOCHAIN_API_HEADER = { "API-KEY": string };
