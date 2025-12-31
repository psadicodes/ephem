import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  encryptMessage, 
  decryptMessage, 
  importPublicKey,
} from '@/lib/crypto';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isMine: boolean;
}

export function useMessages(
  userId: string | undefined,
  friendId: string | undefined,
  myPrivateKey: CryptoKey | undefined,
  friendPublicKey: string | undefined
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const decryptMessages = useCallback(async (
    rawMessages: any[],
    privateKey: CryptoKey,
    friendPubKeyStr: string
  ) => {
    const friendPubKey = await importPublicKey(friendPubKeyStr);
    
    const decrypted = await Promise.all(
      rawMessages.map(async (msg) => {
        try {
          const content = await decryptMessage(
            msg.encrypted_content,
            msg.iv,
            privateKey,
            friendPubKey
          );
          return {
            id: msg.id,
            senderId: msg.sender_id,
            receiverId: msg.receiver_id,
            content,
            createdAt: msg.created_at,
            isMine: msg.sender_id === userId,
          };
        } catch (err) {
          console.error('Failed to decrypt message:', err);
          return {
            id: msg.id,
            senderId: msg.sender_id,
            receiverId: msg.receiver_id,
            content: '[Encrypted message - unable to decrypt]',
            createdAt: msg.created_at,
            isMine: msg.sender_id === userId,
          };
        }
      })
    );

    return decrypted;
  }, [userId]);

  const fetchMessages = useCallback(async () => {
    if (!userId || !friendId || !myPrivateKey || !friendPublicKey) return;

    setIsLoading(true);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      setIsLoading(false);
      return;
    }

    const decrypted = await decryptMessages(data || [], myPrivateKey, friendPublicKey);
    setMessages(decrypted);
    setIsLoading(false);
  }, [userId, friendId, myPrivateKey, friendPublicKey, decryptMessages]);

  useEffect(() => {
    fetchMessages();

    if (!userId || !friendId) return;

    // Subscribe to new messages
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          if (payload.new.sender_id === friendId && myPrivateKey && friendPublicKey) {
            const decrypted = await decryptMessages([payload.new], myPrivateKey, friendPublicKey);
            setMessages(prev => [...prev, ...decrypted]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, friendId, myPrivateKey, friendPublicKey, fetchMessages, decryptMessages]);

  const sendMessage = async (content: string) => {
    if (!userId || !friendId || !myPrivateKey || !friendPublicKey) return;

    const friendPubKey = await importPublicKey(friendPublicKey);
    const { encrypted, iv } = await encryptMessage(content, myPrivateKey, friendPubKey);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        receiver_id: friendId,
        encrypted_content: encrypted,
        iv: iv,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    // Add to local state immediately
    setMessages(prev => [...prev, {
      id: data.id,
      senderId: userId,
      receiverId: friendId,
      content,
      createdAt: data.created_at,
      isMine: true,
    }]);
  };

  return { messages, isLoading, sendMessage };
}
