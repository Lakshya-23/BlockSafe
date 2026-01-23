import { NextResponse } from 'next/server';
import { publicKeyConvert } from 'secp256k1';
import { createCipheriv, randomBytes, createECDH } from 'crypto';

export const runtime = 'nodejs';

// Node configurations
const NODE_CONFIG = {
  alpha: {
    publicKey: process.env.NODE_ALPHA_PUBLIC_KEY || '0x04bf6b6825d38850fb8fb10e0e5e9c5d0b95c81d4f1cd1e39b4d7b68e88a7fc51aef4a1e8c3cd6f52e39b0c98e4f1a2f9c04ec43c1c9b5e7c8d0f2a3b4c5d6e7f',
  },
  beta: {
    publicKey: process.env.NODE_BETA_PUBLIC_KEY || '0x04c2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
  },
  gamma: {
    publicKey: process.env.NODE_GAMMA_PUBLIC_KEY || '0x04d3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e',
  },
};


function encryptWithPublicKey(publicKey, message) {
  try {
    
    const pubKeyHex = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
    const pubKeyBuffer = Buffer.from(pubKeyHex, 'hex');
    
    const ecdh = createECDH('secp256k1');
    ecdh.generateKeys();
    const ephemPrivateKey = ecdh.getPrivateKey();
    const ephemPublicKey = ecdh.getPublicKey('hex', 'uncompressed');
    
    const sharedSecret = ecdh.computeSecret(pubKeyBuffer);
    
    const aesKey = sharedSecret.slice(0, 32);
    
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', aesKey, iv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      ephemPublicKey: ephemPublicKey,
      ciphertext: encrypted,
      mac: '' 
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt: ' + error.message);
  }
}


export async function POST(request) {
  try {
    const { shares } = await request.json();

    if (!shares || !Array.isArray(shares) || shares.length !== 3) {
      return NextResponse.json(
        { error: 'Invalid shares array' },
        { status: 400 }
      );
    }

    const encryptedShares = [
      encryptWithPublicKey(NODE_CONFIG.alpha.publicKey, shares[0]),
      encryptWithPublicKey(NODE_CONFIG.beta.publicKey, shares[1]),
      encryptWithPublicKey(NODE_CONFIG.gamma.publicKey, shares[2]),
    ];

    const encryptedSharesStrings = encryptedShares.map(s => JSON.stringify(s));

    return NextResponse.json({
      encryptedShares: encryptedSharesStrings,
    });
  } catch (error) {
    console.error('Encryption error:', error);
    return NextResponse.json(
      { error: 'Failed to encrypt shares', details: error.message },
      { status: 500 }
    );
  }
}
