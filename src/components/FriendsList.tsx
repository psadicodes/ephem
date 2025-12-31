import { Users, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Friend } from '@/hooks/useFriendRequests';

interface FriendsListProps {
  friends: Friend[];
  selectedFriendId: string | undefined;
  onSelectFriend: (friend: Friend) => void;
}

export function FriendsList({ friends, selectedFriendId, onSelectFriend }: FriendsListProps) {
  return (
    <div className="glass rounded-xl p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Users className="w-5 h-5 text-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Friends</p>
          <p className="text-xs text-muted-foreground">
            {friends.length} {friends.length === 1 ? 'connection' : 'connections'}
          </p>
        </div>
      </div>

      {friends.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No friends yet</p>
          <p className="text-xs">Add someone using their code</p>
        </div>
      ) : (
        <div className="space-y-2">
          {friends.map((friend) => (
            <Button
              key={friend.id}
              variant={selectedFriendId === friend.id ? 'secondary' : 'ghost'}
              className={`w-full justify-between h-auto py-3 ${
                selectedFriendId === friend.id ? 'glow-subtle' : ''
              }`}
              onClick={() => onSelectFriend(friend)}
            >
              <span className="font-mono text-sm">{friend.displayCode}</span>
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
