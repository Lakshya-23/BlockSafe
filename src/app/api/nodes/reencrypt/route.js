import { NextResponse } from 'next/server';
import { createDecipheriv, createECDH } from 'crypto';
import { ethers } from 'ethers';
import { getContract } from '@/lib/contract';

// Force Node.js runtime
export const runtime = 'nodejs';

// Get node private key from environment
function getNodePrivateKey(nodeName) {
  const key = process.env[`NODE_${nodeName.toUpperCase()}_PRIVATE_KEY`];
  if (!key) {
    throw new Error(`Private key for node ${nodeName} not configured`);
  }
  return key.startsWith('0x') ? key.slice(2) : key;
}

import { decrypt } from '@metamask/eth-sig-util';

/**
 * Decrypt data using eth-sig-util (compatible with frontend encryption)
 */
function decryptWithPrivateKey(privateKeyHex, encryptedData) {
  try {
    // eth-sig-util expects the private key as a hex string
    // encryptedData should be the object { version, nonce, ephemPublicKey, ciphertext }
    // which matches what we stored in the shares
    
    const decrypted = decrypt({
      encryptedData: encryptedData,
      privateKey: privateKeyHex
    });
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt share');
  }
}

import { encrypt } from '@metamask/eth-sig-util';

/**
 * Encrypt data using eth-sig-util (compatible with MetaMask eth_decrypt)
 */
function encryptWithPublicKey(publicKey, message) {
  try {
    // Ensure publicKey is a buffer or string as expected by eth-sig-util
    // eth-sig-util expects a base64 encoded string or hex string for x25519 key
    // We'll assume the frontend sends the key as returned by eth_getEncryptionPublicKey (base64)
    
    const encrypted = encrypt({
      publicKey: publicKey,
      data: message,
      version: 'x25519-xsalsa20-poly1305',
    });

    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt: ' + error.message);
  }
}

/**
 * POST /api/nodes/reencrypt
 * Re-encrypt a file share for a requesting user
 * 
 * Body: {
 *   nodeId: 'alpha' | 'beta' | 'gamma',
 *   fileId: number,
 *   recipientPublicKey: string (Ethereum address or public key),
 *   signature: string (signed message from recipient)
 * }
 */
export async function POST(request) {
  try {
    const { nodeId, fileId, recipientPublicKey, signature, userAddress } = await request.json();

    // Validate inputs
    if (!nodeId || !fileId || !recipientPublicKey || !signature || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (!['alpha', 'beta', 'gamma'].includes(nodeId)) {
      return NextResponse.json(
        { error: 'Invalid nodeId' },
        { status: 400 }
      );
    }

    // Verify signature (the user must have signed a message proving they want access)
    try {
      const message = `Requesting access to file ${fileId}`;
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      // Check if recovered address matches the userAddress
      if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
        return NextResponse.json(
          { error: 'Invalid signature: Address mismatch' },
          { status: 403 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 403 }
      );
    }

    // Get file details from blockchain
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const contract = getContract(provider);
    
    const fileDetails = await contract.getFileDetails(fileId);
    if (!fileDetails || !fileDetails.currentCid) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Get encrypted shares
    const shares = fileDetails.encryptedShares;
    let encryptedShare;
    
    switch (nodeId) {
      case 'alpha':
        encryptedShare = shares[0];
        break;
      case 'beta':
        encryptedShare = shares[1];
        break;
      case 'gamma':
        encryptedShare = shares[2];
        break;
    }

    if (!encryptedShare) {
      return NextResponse.json(
        { error: 'No encrypted share found for this node' },
        { status: 404 }
      );
    }

    // Parse the encrypted share
    const parsedShare = JSON.parse(encryptedShare);

    // Decrypt the share using this node's private key
    const nodePrivateKey = getNodePrivateKey(nodeId);
    const decryptedShare = decryptWithPrivateKey(nodePrivateKey, parsedShare);

    // Re-encrypt the share for the recipient
    const reEncryptedShare = encryptWithPublicKey(recipientPublicKey, decryptedShare);

    return NextResponse.json({
      reEncryptedShare: JSON.stringify(reEncryptedShare),
    });
  } catch (error) {
    console.error('Re-encryption error:', error);
    return NextResponse.json(
      { error: 'Re-encryption failed', details: error.message },
      { status: 500 }
    );
  }
}
