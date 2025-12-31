import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  generateKeyPair, 
  exportPublicKey, 
  exportPrivateKey, 
  importPrivateKey,
  generateDisplayCode,
  type KeyPair 
} from '@/lib/crypto';

export interface EphemeralUser {
  id: string;
  displayCode: string;
  publicKey: string;
  privateKey: CryptoKey;
}

export function useEphemeralUser() {
  const [user, setUser] = useState<EphemeralUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeUser();
  }, []);

  async function initializeUser() {
    try {
      setIsLoading(true);
      setError(null);

      // Generate new key pair
      const keyPair = await generateKeyPair();
      const publicKeyStr = await exportPublicKey(keyPair.publicKey);
      const privateKeyStr = await exportPrivateKey(keyPair.privateKey);
      const displayCode = generateDisplayCode();

      // Store in database
      const { data, error: dbError } = await supabase
        .from('ephemeral_users')
        .insert({
          display_code: displayCode,
          public_key: publicKeyStr,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Store private key in session storage (ephemeral)
      sessionStorage.setItem('privateKey', privateKeyStr);
      sessionStorage.setItem('userId', data.id);

      setUser({
        id: data.id,
        displayCode: data.display_code,
        publicKey: publicKeyStr,
        privateKey: keyPair.privateKey,
      });
    } catch (err) {
      console.error('Failed to initialize user:', err);
      setError('Failed to create anonymous identity');
    } finally {
      setIsLoading(false);
    }
  }

  return { user, isLoading, error, reinitialize: initializeUser };
}
