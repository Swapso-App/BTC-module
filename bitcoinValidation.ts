import * as bitcoin from 'bitcoinjs-lib';

export const validateBitcoinAddress = (address: string): boolean => {
  try {
    bitcoin.address.toOutputScript(address);
    
    const isValidPrefix = address.startsWith('1') || 
                         address.startsWith('3') || 
                         address.startsWith('bc1');
                         
    const isValidLength = address.length >= 26 && address.length <= 89;
    
    return isValidPrefix && isValidLength;
  } catch (error) {
    return false;
  }
};

export const getAddressType = (address: string): string => {
  try {
    if (address.startsWith('1')) return 'P2PKH (Legacy)';
    if (address.startsWith('3')) return 'P2SH (Segwit)';
    if (address.startsWith('bc1q')) return 'P2WPKH (Native Segwit)';
    if (address.startsWith('bc1p')) return 'P2TR (Taproot)';
    return 'Unknown';
  } catch (error) {
    return 'Invalid';
  }
};