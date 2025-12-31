import { Copy, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface UserIdentityProps {
  displayCode: string;
  onReset: () => void;
}

export function UserIdentity({ displayCode, onReset }: UserIdentityProps) {
  const copyCode = () => {
    navigator.clipboard.writeText(displayCode);
    toast.success('Code copied to clipboard');
  };

  return (
    <div className="glass rounded-xl p-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center glow-subtle">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Your Anonymous ID</p>
          <p className="text-xs text-muted-foreground/60">Share this code to receive friend requests</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-background/50 rounded-lg px-4 py-3 border border-border/50">
          <span className="font-mono text-xl tracking-wider text-gradient font-bold">
            {displayCode}
          </span>
        </div>
        
        <Button
          variant="secondary"
          size="icon"
          onClick={copyCode}
          className="shrink-0 hover:glow-subtle transition-all"
        >
          <Copy className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={onReset}
          className="shrink-0 hover:glow-subtle transition-all"
          title="Reset identity"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground/60 mt-3 flex items-center gap-1">
        <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
        End-to-end encrypted • Resets on refresh
      </p>
    </div>
  );
}
