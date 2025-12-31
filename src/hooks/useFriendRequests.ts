import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  from_user?: {
    id: string;
    display_code: string;
    public_key: string;
  };
}

export interface Friend {
  id: string;
  displayCode: string;
  publicKey: string;
}

export function useFriendRequests(userId: string | undefined) {
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPendingRequests = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        *,
        from_user:ephemeral_users!friend_requests_from_user_id_fkey(id, display_code, public_key)
      `)
      .eq('to_user_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching requests:', error);
      return;
    }

    setPendingRequests(data || []);
  }, [userId]);

  const fetchFriends = useCallback(async () => {
    if (!userId) return;

    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (error) {
      console.error('Error fetching friends:', error);
      return;
    }

    const friendIds = (friendships || []).map(f => 
      f.user1_id === userId ? f.user2_id : f.user1_id
    );

    if (friendIds.length === 0) {
      setFriends([]);
      return;
    }

    const { data: users } = await supabase
      .from('ephemeral_users')
      .select('*')
      .in('id', friendIds);

    setFriends((users || []).map(u => ({
      id: u.id,
      displayCode: u.display_code,
      publicKey: u.public_key,
    })));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    setIsLoading(true);
    Promise.all([fetchPendingRequests(), fetchFriends()]).finally(() => {
      setIsLoading(false);
    });

    // Subscribe to realtime updates
    const channel = supabase
      .channel('friend-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_requests',
          filter: `to_user_id=eq.${userId}`,
        },
        async (payload) => {
          // Fetch the sender info
          const { data: sender } = await supabase
            .from('ephemeral_users')
            .select('*')
            .eq('id', payload.new.from_user_id)
            .single();

          if (sender) {
            toast.info(`Friend request from ${sender.display_code}`, {
              description: 'Someone wants to chat with you!',
              duration: 5000,
            });
          }

          fetchPendingRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friend_requests',
        },
        () => {
          fetchPendingRequests();
          fetchFriends();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friendships',
        },
        () => {
          fetchFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchPendingRequests, fetchFriends]);

  const sendFriendRequest = async (targetCode: string) => {
    if (!userId) return { success: false, error: 'Not initialized' };

    // Find user by display code
    const { data: targetUser, error: findError } = await supabase
      .from('ephemeral_users')
      .select('*')
      .eq('display_code', targetCode.toUpperCase())
      .single();

    if (findError || !targetUser) {
      return { success: false, error: 'User not found' };
    }

    if (targetUser.id === userId) {
      return { success: false, error: 'Cannot add yourself' };
    }

    // Check if already friends
    const { data: existing } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user1_id.eq.${userId},user2_id.eq.${targetUser.id}),and(user1_id.eq.${targetUser.id},user2_id.eq.${userId})`)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Already friends' };
    }

    // Send request
    const { error: insertError } = await supabase
      .from('friend_requests')
      .insert({
        from_user_id: userId,
        to_user_id: targetUser.id,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        return { success: false, error: 'Request already sent' };
      }
      return { success: false, error: 'Failed to send request' };
    }

    return { success: true };
  };

  const acceptRequest = async (requestId: string) => {
    const request = pendingRequests.find(r => r.id === requestId);
    if (!request || !userId) return;

    // Update request status
    await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    // Create friendship
    await supabase
      .from('friendships')
      .insert({
        user1_id: request.from_user_id,
        user2_id: userId,
      });

    toast.success('Friend added!');
    fetchPendingRequests();
    fetchFriends();
  };

  const rejectRequest = async (requestId: string) => {
    await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    fetchPendingRequests();
  };

  return {
    pendingRequests,
    friends,
    isLoading,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
  };
}
