import { useState } from 'react';
import { Loader2, Lock, Zap } from 'lucide-react';
import { useEphemeralUser } from '@/hooks/useEphemeralUser';
import { useFriendRequests, type Friend } from '@/hooks/useFriendRequests';
import { useMessages } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { UserIdentity } from '@/components/UserIdentity';
import { AddFriend } from '@/components/AddFriend';
import { FriendRequestPopup } from '@/components/FriendRequestPopup';
import { FriendsList } from '@/components/FriendsList';
import { ChatWindow } from '@/components/ChatWindow';

const Index = () => {
  const { user, isLoading: userLoading, reinitialize } = useEphemeralUser();
  const { 
    pendingRequests, 
    friends, 
    sendFriendRequest, 
    acceptRequest, 
    rejectRequest 
  } = useFriendRequests(user?.id);
  
  const [selectedFriend, setSelectedFriend] = useState<Friend | undefined>();
  
  const { messages, isLoading: messagesLoading, sendMessage } = useMessages(
    user?.id,
    selectedFriend?.id,
    user?.privateKey,
    selectedFriend?.publicKey
  );

  const { friendIsTyping, startTyping, stopTyping } = useTypingIndicator(
    user?.id,
    selectedFriend?.id
  );

  const handleSendMessage = (content: string, options?: { expiresInSeconds?: number; file?: File }) => {
    sendMessage(content, options);
    stopTyping();
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
          <p className="mt-4 text-muted-foreground font-mono">Generating anonymous identity...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-destructive">
          <p>Failed to initialize. Please refresh.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-4">
            <Lock className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono text-muted-foreground">E2E Encrypted</span>
            <Zap className="w-4 h-4 text-accent" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            <span className="text-gradient">Phantom</span>
            <span className="text-foreground">Chat</span>
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Anonymous, encrypted conversations. Your identity vanishes when you leave.
          </p>
        </header>

        <div className="grid md:grid-cols-[350px_1fr] gap-6">
          {/* Sidebar */}
          <div className="space-y-4">
            <UserIdentity 
              displayCode={user.displayCode} 
              onReset={reinitialize} 
            />
            
            <AddFriend onSendRequest={sendFriendRequest} />
            
            {pendingRequests.length > 0 && (
              <FriendRequestPopup
                requests={pendingRequests}
                onAccept={acceptRequest}
                onReject={rejectRequest}
              />
            )}
            
            <FriendsList
              friends={friends}
              selectedFriendId={selectedFriend?.id}
              onSelectFriend={setSelectedFriend}
            />
          </div>

          {/* Chat Area */}
          <div className="hidden md:block">
            {selectedFriend ? (
              <ChatWindow
                friend={selectedFriend}
                messages={messages}
                isLoading={messagesLoading}
                friendIsTyping={friendIsTyping}
                onSendMessage={handleSendMessage}
                onBack={() => setSelectedFriend(undefined)}
                onInputChange={startTyping}
              />
            ) : (
              <div className="glass rounded-xl h-[500px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Lock className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">Select a friend to start chatting</p>
                  <p className="text-sm">All messages are end-to-end encrypted</p>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Chat */}
          {selectedFriend && (
            <div className="md:hidden fixed inset-0 z-50 bg-background p-4">
              <ChatWindow
                friend={selectedFriend}
                messages={messages}
                isLoading={messagesLoading}
                friendIsTyping={friendIsTyping}
                onSendMessage={handleSendMessage}
                onBack={() => setSelectedFriend(undefined)}
                onInputChange={startTyping}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-xs text-muted-foreground/60">
          <p>Your data is encrypted locally. We never see your messages.</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
