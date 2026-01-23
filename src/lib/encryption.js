
export async function generateKey() {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function encryptFile(file, key) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const fileData = await file.arrayBuffer();

  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    fileData
  );

  const result = new Uint8Array(iv.length + encryptedContent.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encryptedContent), iv.length);

  return result;
}

export async function decryptFile(encryptedData, key) {
  const iv = encryptedData.slice(0, 12);
  const data = encryptedData.slice(12);

  const decryptedContent = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  return decryptedContent;
}

export async function exportKey(key) {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return new Uint8Array(exported);
}

export async function importKey(rawKey) {
  return await window.crypto.subtle.importKey(
    'raw',
    rawKey,
    'AES-GCM',
    true,
    ['encrypt', 'decrypt']
  );
}
