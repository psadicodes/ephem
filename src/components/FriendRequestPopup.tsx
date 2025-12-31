import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FriendRequest } from '@/hooks/useFriendRequests';

interface FriendRequestPopupProps {
  requests: FriendRequest[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export function FriendRequestPopup({ requests, onAccept, onReject }: FriendRequestPopupProps) {
  if (requests.length === 0) return null;

  return (
    <div className="glass rounded-xl p-4 animate-slide-up border-2 border-primary/30" style={{ animationDelay: '0.2s' }}>
      <p className="text-sm font-medium mb-3 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
        Friend Requests ({requests.length})
      </p>
      
      <div className="space-y-2">
        {requests.map((request) => (
          <div 
            key={request.id} 
            className="flex items-center justify-between bg-background/50 rounded-lg p-3 border border-border/50"
          >
            <div>
              <p className="font-mono text-sm text-primary">
                {request.from_user?.display_code || 'Unknown'}
              </p>
              <p className="text-xs text-muted-foreground">wants to chat</p>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onReject(request.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => onAccept(request.id)}
                className="h-8 w-8 p-0 glow-primary"
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
