import * as bitcoinjs from "bitcoinjs-lib";

export type MultiSigAddressType = "P2SH" | "P2SH-P2WSH" | "P2WSH";

export type MultiSigPublicKey = string | Buffer | Uint8Array;

export type CreateMultiSigAddressInput = {
  publicKeys: MultiSigPublicKey[];
  requiredSignatures: number;
  network: bitcoinjs.networks.Network;
  type?: MultiSigAddressType;
};

export type CreateMultiSigAddressResult = {
  type: MultiSigAddressType;
  address: string;
  redeemScript?: string;
  witnessScript?: string;
};

function toPublicKeyBuffer(publicKey: MultiSigPublicKey): Buffer {
  if (Buffer.isBuffer(publicKey)) {
    return publicKey;
  }

  if (publicKey instanceof Uint8Array) {
    return Buffer.from(publicKey);
  }

  if (typeof publicKey === "string") {
    return Buffer.from(publicKey, "hex");
  }

  throw new Error("Invalid public key format.");
}

export function createMultiSigAddress(
  input: CreateMultiSigAddressInput
): CreateMultiSigAddressResult {
  const { publicKeys, requiredSignatures, network, type = "P2SH" } = input;

  if (!Array.isArray(publicKeys) || publicKeys.length === 0) {
    throw new Error("At least one public key is required.");
  }

  if (!Number.isInteger(requiredSignatures) || requiredSignatures <= 0) {
    throw new Error("requiredSignatures must be a positive integer.");
  }

  if (requiredSignatures > publicKeys.length) {
    throw new Error("requiredSignatures cannot be greater than number of public keys.");
  }

  const publicKeyBuffers = publicKeys.map(toPublicKeyBuffer);

  const p2ms = bitcoinjs.payments.p2ms({
    m: requiredSignatures,
    pubkeys: publicKeyBuffers,
    network,
  });

  if (!p2ms.output) {
    throw new Error("Failed to build multisig witness/redeem script.");
  }

  if (type === "P2SH") {
    const p2sh = bitcoinjs.payments.p2sh({
      redeem: p2ms,
      network,
    });

    if (!p2sh.address) {
      throw new Error("Failed to generate P2SH multisig address.");
    }

    return {
      type,
      address: p2sh.address,
      redeemScript: p2ms.output.toString("hex"),
    };
  }

  if (type === "P2SH-P2WSH") {
    const p2wsh = bitcoinjs.payments.p2wsh({
      redeem: p2ms,
      network,
    });

    const p2sh = bitcoinjs.payments.p2sh({
      redeem: p2wsh,
      network,
    });

    if (!p2sh.address || !p2wsh.output) {
      throw new Error("Failed to generate P2SH-P2WSH multisig address.");
    }

    return {
      type,
      address: p2sh.address,
      redeemScript: p2wsh.output.toString("hex"),
      witnessScript: p2ms.output.toString("hex"),
    };
  }

  if (type === "P2WSH") {
    const p2wsh = bitcoinjs.payments.p2wsh({
      redeem: p2ms,
      network,
    });

    if (!p2wsh.address) {
      throw new Error("Failed to generate P2WSH multisig address.");
    }

    return {
      type,
      address: p2wsh.address,
      witnessScript: p2ms.output.toString("hex"),
    };
  }

  throw new Error("Unsupported multisig address type.");
}
