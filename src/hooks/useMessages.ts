import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  encryptMessage, 
  decryptMessage, 
  importPublicKey,
} from '@/lib/crypto';
import {
  encryptFile,
  uploadEncryptedFile,
  downloadEncryptedFile,
  decryptFile,
} from '@/lib/fileEncryption';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isMine: boolean;
  expiresAt: string | null;
  messageType: 'text' | 'image' | 'file';
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  isExpired?: boolean;
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
    const now = new Date();
    
    const decrypted = await Promise.all(
      rawMessages.map(async (msg) => {
        // Check if expired
        const expiresAt = msg.expires_at ? new Date(msg.expires_at) : null;
        if (expiresAt && expiresAt < now) {
          return null; // Skip expired messages
        }

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
            expiresAt: msg.expires_at,
            messageType: msg.message_type as 'text' | 'image' | 'file',
            fileName: msg.file_name,
            fileSize: msg.file_size,
            fileType: msg.file_type,
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
            expiresAt: msg.expires_at,
            messageType: 'text' as const,
          };
        }
      })
    );

    return decrypted.filter(Boolean) as Message[];
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

  // Check for expired messages periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setMessages(prev => prev.filter(msg => {
        if (!msg.expiresAt) return true;
        return new Date(msg.expiresAt) > now;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchMessages();

    if (!userId || !friendId) return;

    // Subscribe to new messages
    const channel = supabase
      .channel('messages-realtime')
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

  const sendMessage = async (
    content: string,
    options?: {
      expiresInSeconds?: number;
      file?: File;
    }
  ) => {
    if (!userId || !friendId || !myPrivateKey || !friendPublicKey) return;

    const friendPubKey = await importPublicKey(friendPublicKey);
    let messageType: 'text' | 'image' | 'file' = 'text';
    let fileName: string | undefined;
    let fileSize: number | undefined;
    let fileType: string | undefined;
    let encryptedContent: string;
    let iv: string;

    if (options?.file) {
      // Encrypt and upload file
      const encrypted = await encryptFile(options.file, myPrivateKey, friendPubKey);
      const filePath = await uploadEncryptedFile(encrypted.encryptedBlob, encrypted.fileName);
      
      // Store file path as encrypted content
      const pathEncrypted = await encryptMessage(filePath, myPrivateKey, friendPubKey);
      encryptedContent = pathEncrypted.encrypted;
      iv = pathEncrypted.iv;
      
      messageType = options.file.type.startsWith('image/') ? 'image' : 'file';
      fileName = encrypted.fileName;
      fileSize = encrypted.fileSize;
      fileType = encrypted.fileType;
    } else {
      const encrypted = await encryptMessage(content, myPrivateKey, friendPubKey);
      encryptedContent = encrypted.encrypted;
      iv = encrypted.iv;
    }

    const expiresAt = options?.expiresInSeconds 
      ? new Date(Date.now() + options.expiresInSeconds * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        receiver_id: friendId,
        encrypted_content: encryptedContent,
        iv: iv,
        expires_at: expiresAt,
        message_type: messageType,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
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
      content: options?.file ? URL.createObjectURL(options.file) : content,
      createdAt: data.created_at,
      isMine: true,
      expiresAt: data.expires_at,
      messageType,
      fileName,
      fileSize,
      fileType,
    }]);
  };

  const downloadFile = async (message: Message): Promise<Blob | null> => {
    if (!myPrivateKey || !friendPublicKey) return null;

    try {
      const friendPubKey = await importPublicKey(friendPublicKey);
      
      // Decrypt the file path from content
      // For received messages, we need to decrypt the path first
      const encryptedData = await downloadEncryptedFile(message.content);
      const decryptedData = await decryptFile(encryptedData, message.content, myPrivateKey, friendPubKey);
      
      return new Blob([decryptedData], { type: message.fileType });
    } catch (err) {
      console.error('Failed to download file:', err);
      return null;
    }
  };

  return { messages, isLoading, sendMessage, downloadFile };
}
