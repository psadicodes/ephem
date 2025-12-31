import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingState {
  [oderId: string]: boolean;
}

export function useTypingIndicator(userId: string | undefined, friendId: string | undefined) {
  const [isTyping, setIsTyping] = useState(false);
  const [friendIsTyping, setFriendIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId || !friendId) return;

    const channelName = [userId, friendId].sort().join('-');
    
    const channel = supabase.channel(`typing:${channelName}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ typing: boolean }>();
        const friendState = state[friendId];
        if (friendState && friendState.length > 0) {
          setFriendIsTyping(friendState[0].typing || false);
        } else {
          setFriendIsTyping(false);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ typing: false });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [userId, friendId]);

  const startTyping = useCallback(async () => {
    if (!channelRef.current) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to true
    if (!isTyping) {
      setIsTyping(true);
      await channelRef.current.track({ typing: true });
    }

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      if (channelRef.current) {
        await channelRef.current.track({ typing: false });
      }
    }, 3000);
  }, [isTyping]);

  const stopTyping = useCallback(async () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    if (channelRef.current) {
      await channelRef.current.track({ typing: false });
    }
  }, []);

  return { friendIsTyping, startTyping, stopTyping };
}
