import { supabase } from '@/integrations/supabase/client';

// Encrypt a file using AES-GCM
export async function encryptFile(
  file: File,
  senderPrivateKey: CryptoKey,
  receiverPublicKey: CryptoKey
): Promise<{ encryptedBlob: Blob; iv: string; fileName: string; fileType: string; fileSize: number }> {
  // Derive shared key
  const sharedKey = await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: receiverPublicKey,
    },
    senderPrivateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // Generate IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    arrayBuffer
  );

  return {
    encryptedBlob: new Blob([encrypted]),
    iv: btoa(String.fromCharCode(...iv)),
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  };
}

// Decrypt a file
export async function decryptFile(
  encryptedData: ArrayBuffer,
  iv: string,
  receiverPrivateKey: CryptoKey,
  senderPublicKey: CryptoKey
): Promise<ArrayBuffer> {
  // Derive shared key
  const sharedKey = await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: senderPublicKey,
    },
    receiverPrivateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );

  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  
  return await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    sharedKey,
    encryptedData
  );
}

// Upload encrypted file to storage
export async function uploadEncryptedFile(
  encryptedBlob: Blob,
  fileName: string
): Promise<string> {
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('encrypted-files')
    .upload(uniqueName, encryptedBlob);

  if (error) throw error;
  
  return data.path;
}

// Download encrypted file from storage
export async function downloadEncryptedFile(path: string): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage
    .from('encrypted-files')
    .download(path);

  if (error) throw error;
  
  return await data.arrayBuffer();
}
