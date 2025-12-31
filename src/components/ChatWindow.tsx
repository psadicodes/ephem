import { useState, useRef, useEffect } from 'react';
import { Send, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Message } from '@/hooks/useMessages';
import type { Friend } from '@/hooks/useFriendRequests';

interface ChatWindowProps {
  friend: Friend;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onBack: () => void;
}

export function ChatWindow({ friend, messages, isLoading, onSendMessage, onBack }: ChatWindowProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="glass rounded-xl overflow-hidden flex flex-col h-[500px] animate-slide-up">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0 md:hidden"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        
        <div className="flex-1">
          <p className="font-mono text-sm text-primary">{friend.displayCode}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="w-3 h-3" />
            End-to-end encrypted
          </p>
        </div>
        
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 && !isLoading ? (
          <div className="h-full flex items-center justify-center text-center text-muted-foreground">
            <div>
              <Lock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Start a secure conversation</p>
              <p className="text-xs">Messages are encrypted end-to-end</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.isMine
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary text-secondary-foreground rounded-bl-md'
                  }`}
                >
                  <p className="text-sm break-words">{message.content}</p>
                  <p className={`text-[10px] mt-1 ${
                    message.isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'
                  }`}>
                    {new Date(message.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border/50 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button 
          type="submit" 
          disabled={!input.trim()}
          className="shrink-0 glow-primary"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
