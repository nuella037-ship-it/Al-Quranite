// js/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

// REPLACE THESE WITH YOUR ACTUAL SUPABASE PROJECT CREDENTIALS
const supabaseUrl = 'https://txdmbluqqgjnbzawqogu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4ZG1ibHVxcWdqbmJ6YXdxb2d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDgzMjksImV4cCI6MjEwMTkyNDMyOX0.3rz9HyC_ck09NLeIMdFSAFtsgncgWbz-3IhRTxaTMyc';

export const supabase = createClient(supabaseUrl, supabaseKey);