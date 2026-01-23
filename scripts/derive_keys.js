import { getEncryptionPublicKey } from '@metamask/eth-sig-util';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const nodes = ['ALPHA', 'BETA', 'GAMMA'];

console.log('--- NEW KEYS ---');
nodes.forEach(node => {
  const privateKey = envConfig[`NODE_${node}_PRIVATE_KEY`];
  if (privateKey) {
    
    const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    const pubKey = getEncryptionPublicKey(cleanKey);
    console.log(`${node.toLowerCase()}: ${pubKey}`);
  } else {
    console.log(`${node.toLowerCase()}: MISSING`);
  }
});
console.log('--- END KEYS ---');
