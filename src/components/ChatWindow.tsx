import { useState, useRef, useEffect } from 'react';
import { Send, Lock, ArrowLeft, Paperclip, Clock, X, Image, File, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Message } from '@/hooks/useMessages';
import type { Friend } from '@/hooks/useFriendRequests';

interface ChatWindowProps {
  friend: Friend;
  messages: Message[];
  isLoading: boolean;
  friendIsTyping: boolean;
  onSendMessage: (content: string, options?: { expiresInSeconds?: number; file?: File }) => void;
  onBack: () => void;
  onInputChange: () => void;
}

const EXPIRY_OPTIONS = [
  { label: 'No expiry', value: undefined },
  { label: '10 seconds', value: 10 },
  { label: '1 minute', value: 60 },
  { label: '5 minutes', value: 300 },
  { label: '1 hour', value: 3600 },
];

export function ChatWindow({ 
  friend, 
  messages, 
  isLoading, 
  friendIsTyping,
  onSendMessage, 
  onBack,
  onInputChange,
}: ChatWindowProps) {
  const [input, setInput] = useState('');
  const [expirySeconds, setExpirySeconds] = useState<number | undefined>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, friendIsTyping]);

  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;
    
    onSendMessage(input.trim(), { 
      expiresInSeconds: expirySeconds,
      file: selectedFile || undefined,
    });
    setInput('');
    setSelectedFile(null);
    setExpirySeconds(undefined);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    onInputChange();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTimeRemaining = (expiresAt: string) => {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return 'Expiring...';
    if (remaining < 60000) return `${Math.ceil(remaining / 1000)}s`;
    if (remaining < 3600000) return `${Math.ceil(remaining / 60000)}m`;
    return `${Math.ceil(remaining / 3600000)}h`;
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
                  className={`max-w-[80%] rounded-2xl px-4 py-2 relative ${
                    message.isMine
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary text-secondary-foreground rounded-bl-md'
                  }`}
                >
                  {/* File/Image content */}
                  {message.messageType === 'image' && (
                    <div className="mb-2">
                      <div className="flex items-center gap-2 text-xs opacity-70">
                        <Image className="w-4 h-4" />
                        <span>{message.fileName}</span>
                      </div>
                    </div>
                  )}
                  
                  {message.messageType === 'file' && (
                    <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-background/20">
                      <File className="w-5 h-5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{message.fileName}</p>
                        <p className="text-xs opacity-70">
                          {message.fileSize && formatFileSize(message.fileSize)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Text content */}
                  {message.messageType === 'text' && (
                    <p className="text-sm break-words">{message.content}</p>
                  )}

                  {/* Timestamp and expiry */}
                  <div className={`flex items-center gap-2 mt-1 ${
                    message.isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'
                  }`}>
                    <span className="text-[10px]">
                      {new Date(message.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    
                    {message.expiresAt && (
                      <span className="text-[10px] flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {getTimeRemaining(message.expiresAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {friendIsTyping && (
              <div className="flex justify-start">
                <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* File preview */}
      {selectedFile && (
        <div className="px-4 py-2 border-t border-border/50 bg-background/50">
          <div className="flex items-center gap-3">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                <File className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedFile(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border/50 flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0"
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant={expirySeconds ? 'secondary' : 'ghost'}
              size="icon"
              className="shrink-0"
            >
              <Clock className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {EXPIRY_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.label}
                onClick={() => setExpirySeconds(option.value)}
                className={expirySeconds === option.value ? 'bg-secondary' : ''}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Input
          value={input}
          onChange={handleInputChange}
          placeholder={expirySeconds ? `Self-destructs in ${expirySeconds}s...` : "Type a message..."}
          className="flex-1"
        />
        
        <Button 
          type="submit" 
          disabled={!input.trim() && !selectedFile}
          className="shrink-0 glow-primary"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
