export function calcBip32ExtendedKeys(bip32RootKey, hdPath) {
  // Check there's a root key to derive from
  if (!bip32RootKey) {
    return bip32RootKey;
  }
  var extendedKey = bip32RootKey;
  // Derive the key from the path constant
  var pathBits = hdPath.split("/");
  for (var i = 0; i < pathBits.length; i++) {
    var bit = pathBits[i];
    var index = parseInt(bit);
    if (isNaN(index)) {
      continue;
    }
    var hardened = bit[bit.length - 1] == "'";
    var isPriv = !extendedKey.isNeutered();
    var invalidDerivationPath = hardened && !isPriv;
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
