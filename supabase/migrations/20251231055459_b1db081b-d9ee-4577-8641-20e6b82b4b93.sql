-- Create ephemeral users table (stores temporary session info)
CREATE TABLE public.ephemeral_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_code TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create friend requests table
CREATE TABLE public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES public.ephemeral_users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.ephemeral_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

-- Create friendships table
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES public.ephemeral_users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.ephemeral_users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Create messages table (encrypted)
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.ephemeral_users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.ephemeral_users(id) ON DELETE CASCADE,
  encrypted_content TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ephemeral_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Ephemeral users: anyone can read/insert (anonymous system)
CREATE POLICY "Anyone can view ephemeral users" 
ON public.ephemeral_users FOR SELECT USING (true);

CREATE POLICY "Anyone can create ephemeral users" 
ON public.ephemeral_users FOR INSERT WITH CHECK (true);

-- Friend requests: public for this anonymous system
CREATE POLICY "Anyone can view friend requests" 
ON public.friend_requests FOR SELECT USING (true);

CREATE POLICY "Anyone can create friend requests" 
ON public.friend_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update friend requests" 
ON public.friend_requests FOR UPDATE USING (true);

-- Friendships: public for anonymous system
CREATE POLICY "Anyone can view friendships" 
ON public.friendships FOR SELECT USING (true);

CREATE POLICY "Anyone can create friendships" 
ON public.friendships FOR INSERT WITH CHECK (true);

-- Messages: public for anonymous system
CREATE POLICY "Anyone can view messages" 
ON public.messages FOR SELECT USING (true);

CREATE POLICY "Anyone can create messages" 
ON public.messages FOR INSERT WITH CHECK (true);

-- Enable realtime for friend requests and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;