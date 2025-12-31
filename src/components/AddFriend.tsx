import { useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface AddFriendProps {
  onSendRequest: (code: string) => Promise<{ success: boolean; error?: string }>;
}

export function AddFriend({ onSendRequest }: AddFriendProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    const result = await onSendRequest(code.trim());
    setIsLoading(false);

    if (result.success) {
      toast.success('Friend request sent!');
      setCode('');
    } else {
      toast.error(result.error || 'Failed to send request');
    }
  };

  const formatCode = (value: string) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleaned.length <= 4) return cleaned;
    return cleaned.slice(0, 4) + '-' + cleaned.slice(4, 8);
  };

  return (
    <div className="glass rounded-xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="text-sm font-medium">Add Friend</p>
          <p className="text-xs text-muted-foreground">Enter their anonymous code</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(formatCode(e.target.value))}
          placeholder="XXXX-XXXX"
          className="font-mono text-center tracking-wider uppercase"
          maxLength={9}
        />
        <Button 
          type="submit" 
          disabled={isLoading || code.replace('-', '').length !== 8}
          className="shrink-0 glow-primary"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Send'
          )}
        </Button>
      </form>
    </div>
  );
}
