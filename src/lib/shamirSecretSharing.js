
const GF_EXP = new Uint8Array(255);
const GF_LOG = new Uint8Array(256);

(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    
    let y = x << 1;
    
    if (x & 0x80) {
      y ^= 0x1d;
    }
    
    x = y & 0xFF;
  }
  
  GF_LOG[0] = 255; 
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  
  let sum_log = GF_LOG[a] + GF_LOG[b];

  if (sum_log >= 255) sum_log -= 255;
  
  return GF_EXP[sum_log];
}

function gfDiv(a, b) {
  if (b === 0) throw new Error('Division by zero in GF(256)');
  if (a === 0) return 0;
  
  let diff_log = GF_LOG[a] - GF_LOG[b];
 
  if (diff_log < 0) diff_log += 255;
  
  return GF_EXP[diff_log];
}


export function split(secretHex) {
  const secret = hexToBytes(secretHex);
  const shares = [[], [], []];
  
  for (let i = 0; i < secret.length; i++) {
    const s = secret[i];
    
    const a = crypto.getRandomValues(new Uint8Array(1))[0];
    
    shares[0].push(s ^ gfMul(a, 1));
    shares[1].push(s ^ gfMul(a, 2));
    shares[2].push(s ^ gfMul(a, 3));
  }
  
  return [
    '01' + bytesToHex(new Uint8Array(shares[0])),
    '02' + bytesToHex(new Uint8Array(shares[1])),
    '03' + bytesToHex(new Uint8Array(shares[2]))
  ];
}


export function combine(shareStrs) {
  if (shareStrs.length < 2) {
    throw new Error('Need at least 2 shares');
  }
  
  const shares = shareStrs.slice(0, 2).map(s => ({
    x: parseInt(s.substring(0, 2), 16),
    y: hexToBytes(s.substring(2))
  }));
  
  const result = [];
  const x0 = shares[0].x;
  const x1 = shares[1].x;
  
 
  
  const denom = x0 ^ x1;
  if (denom === 0) throw new Error('Duplicate shares provided');

  const coef0 = gfDiv(x1, denom);
  const coef1 = gfDiv(x0, denom);
  
  for (let i = 0; i < shares[0].y.length; i++) {
 
    const val = gfMul(shares[0].y[i], coef0) ^ gfMul(shares[1].y[i], coef1);
    result.push(val);
  }
  
  return bytesToHex(new Uint8Array(result));
}


function hexToBytes(hex) {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
