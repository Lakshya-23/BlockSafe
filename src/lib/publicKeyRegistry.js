
const PUBLIC_KEY_STORAGE_KEY = 'blocksafe_encryption_pubkey';

export async function registerPublicKey(address) {
  try {
    // Request encryption public key from MetaMask
    const publicKey = await window.ethereum.request({
      method: 'eth_getEncryptionPublicKey',
      params: [address],
    });
    
    // Store in localStorage
    const registry = getPublicKeyRegistry();
    registry[address.toLowerCase()] = publicKey;
    localStorage.setItem(PUBLIC_KEY_STORAGE_KEY, JSON.stringify(registry));
    
    console.log('[PublicKeyRegistry] Registered public key for', address);
    return publicKey;
  } catch (error) {
    console.error('[PublicKeyRegistry] Failed to register public key:', error);
    throw error;
  }
}


export function getPublicKey(address) {
  const registry = getPublicKeyRegistry();
  const pubKey = registry[address.toLowerCase()];
  
  if (!pubKey) {
    console.warn('[PublicKeyRegistry] No public key found for', address);
  }
  
  return pubKey;
}

function getPublicKeyRegistry() {
  const stored = localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

export function hasPublicKey(address) {
  return !!getPublicKey(address);
}
