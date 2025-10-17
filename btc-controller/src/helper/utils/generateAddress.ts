import * as bitcoinjs from "bitcoinjs-lib";

export function generateAddress(bip32ExtendedKey, network, index) {
  let wallet = bip32ExtendedKey.derive(index);

  const hasPrivkey = !wallet.isNeutered();
  let privkey;
  if (hasPrivkey) {
    privkey = wallet.toWIF();
  }
  const pubkey = wallet.publicKey.toString("hex");

  // Convert publicKey to Buffer if it's a Uint8Array
  const pubkeyBuffer = Buffer.isBuffer(wallet.publicKey) 
    ? wallet.publicKey 
    : Buffer.from(wallet.publicKey);

  const { address } = bitcoinjs.payments.p2wpkh({
    network,
    pubkey: pubkeyBuffer, // Use the Buffer version
  });
  
  return {
    wallet,
    address,
    pubkey,
    privkey,
  };
}