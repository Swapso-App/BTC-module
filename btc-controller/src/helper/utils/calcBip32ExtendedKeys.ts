export function calcBip32ExtendedKeys(bip32RootKey, hdPath) {
  // Check there's a root key to derive from
  if (!bip32RootKey) {
    return bip32RootKey;
  }
  let extendedKey = bip32RootKey;
  // Derive the key from the path constant
  const pathBits = hdPath.split("/");
  for (let i = 0; i < pathBits.length; i++) {
    const bit = pathBits[i];
    const index = parseInt(bit);
    if (isNaN(index)) {
      continue;
    }
    const hardened = bit[bit.length - 1] === "'";
    const isPriv = !extendedKey.isNeutered();
    const invalidDerivationPath = hardened && !isPriv;
    if (invalidDerivationPath) {
      extendedKey = null;
    } else if (hardened) {
      extendedKey = extendedKey.deriveHardened(index);
    } else {
      extendedKey = extendedKey.derive(index);
    }
  }
  return extendedKey;
}
