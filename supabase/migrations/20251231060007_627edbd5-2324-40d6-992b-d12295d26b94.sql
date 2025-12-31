-- Add expires_at column for self-destructing messages
ALTER TABLE public.messages 
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
ADD COLUMN file_name TEXT DEFAULT NULL,
ADD COLUMN file_size INTEGER DEFAULT NULL,
ADD COLUMN file_type TEXT DEFAULT NULL;

-- Create storage bucket for encrypted files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('encrypted-files', 'encrypted-files', true);

-- Allow anyone to upload to the bucket (anonymous system)
CREATE POLICY "Anyone can upload files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'encrypted-files');

-- Allow anyone to read files
CREATE POLICY "Anyone can read files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'encrypted-files');

-- Create function to clean up expired messages (called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.messages 
  WHERE expires_at IS NOT NULL AND expires_at < now();
END;
$$;