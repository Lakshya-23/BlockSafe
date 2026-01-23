import EthCrypto from 'eth-crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync('node-keys.json', JSON.stringify({ error: '.env.local not found' }));
    return;
  }
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const keys = {};
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      keys[key.trim()] = value.trim();
    }
  });

  const nodeKeys = {
    alpha: keys.NODE_ALPHA_PRIVATE_KEY,
    beta: keys.NODE_BETA_PRIVATE_KEY,
    gamma: keys.NODE_GAMMA_PRIVATE_KEY,
  };

  const publicKeys = {};
  for (const [name, privKey] of Object.entries(nodeKeys)) {
    if (!privKey) {
      publicKeys[name] = 'MISSING';
      continue;
    }
    try {
        const publicKey = EthCrypto.publicKeyByPrivateKey(privKey);
        publicKeys[name] = publicKey;
    } catch (e) {
        publicKeys[name] = `ERROR: ${e.message}`;
    }
  }
  
  fs.writeFileSync(path.join(__dirname, '../node-keys.json'), JSON.stringify(publicKeys, null, 2));
  console.log('Keys written to node-keys.json');
}

main();
