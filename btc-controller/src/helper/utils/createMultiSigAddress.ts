import * as bitcoinjs from 'bitcoinjs-lib';

export interface MultiSigConfig {
  publicKeys: string[];
  requiredSignatures: number;
  network?: bitcoinjs.Network;
  type?: 'P2SH' | 'P2SH-P2WSH' | 'P2WSH';
}

export interface MultiSigResult {
  address: string;
  type: string;
  redeemScript?: Buffer;
  witnessScript?: Buffer;
}

export function createMultiSigAddress({
  publicKeys,
  requiredSignatures,
  network = bitcoinjs.networks.bitcoin,
  type = 'P2SH',
}: MultiSigConfig): MultiSigResult {
  if (requiredSignatures > publicKeys.length) {
    throw new Error('requiredSignatures cannot be greater than number of public keys');
  }

  // Sort public keys lexicographically to support BIP45 & BIP67 validation
  const pubkeys = publicKeys
    .map((k) => Buffer.from(k, 'hex'))
    .sort((a, b) => a.compare(b));

  const p2ms = bitcoinjs.payments.p2ms({
    m: requiredSignatures,
    pubkeys,
    network,
  });

  if (type === 'P2SH') {
    const p2sh = bitcoinjs.payments.p2sh({
      redeem: p2ms,
      network,
    });
    return {
      address: p2sh.address!,
      type,
      redeemScript: p2ms.output,
    };
  }

  if (type === 'P2WSH') {
    const p2wsh = bitcoinjs.payments.p2wsh({
      redeem: p2ms,
      network,
    });
    return {
      address: p2wsh.address!,
      type,
      witnessScript: p2ms.output,
    };
  }

  if (type === 'P2SH-P2WSH') {
    const p2wsh = bitcoinjs.payments.p2wsh({
      redeem: p2ms,
      network,
    });
    const p2sh = bitcoinjs.payments.p2sh({
      redeem: p2wsh,
      network,
    });

    return {
      address: p2sh.address!,
      type,
      redeemScript: p2wsh.output,
      witnessScript: p2ms.output,
    };
  }

  throw new Error(`Unsupported multisig type: ${type}`);
}
