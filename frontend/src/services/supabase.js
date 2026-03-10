import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://aqelfoozbeexnprmcomw.supabase.co";
const supabaseAnonKey ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxZWxmb296YmVleG5wcm1jb213Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0ODc5MjgsImV4cCI6MjA4NTA2MzkyOH0.BpxtDFXO9Nh5cKj72sZXmA_KruZRoKKuW0PYmcrZOXo";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
