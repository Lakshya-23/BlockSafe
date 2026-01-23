import EthCrypto from 'eth-crypto';

async function generateKeys() {
  const alpha = EthCrypto.createIdentity();
  const beta = EthCrypto.createIdentity();
  const gamma = EthCrypto.createIdentity();

  console.log('# Copy these to your .env.local file:');
  console.log('');
  console.log(`NODE_ALPHA_PRIVATE_KEY=${alpha.privateKey}`);
  console.log(`NODE_BETA_PRIVATE_KEY=${beta.privateKey}`);
  console.log(`NODE_GAMMA_PRIVATE_KEY=${gamma.privateKey}`);
  console.log('');
  console.log('# Public keys (for reference):');
  console.log(`# Alpha: ${alpha.publicKey}`);
  console.log(`# Beta: ${beta.publicKey}`);
  console.log(`# Gamma: ${gamma.publicKey}`);
}

generateKeys();
