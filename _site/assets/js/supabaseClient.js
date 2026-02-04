/**
 * supabase-config.js
 * Reusable asset for the Supabase connection
 *
 * Note the Supabase key is the anon key ("publishable" key, safe for public view) as long as role-level security is applied in conjuction.
 * (i.e. no need for secret keys in client-side code - this key is designed to be public)
 * Location: \assets\js\supabaseClient.js
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';


const supabaseUrl = 'https://iepqxczcyvrxcbyeiscc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllcHF4Y3pjeXZyeGNieWVpc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNjU2MDEsImV4cCI6MjA3OTk0MTYwMX0.9fK4TppNy7IekO3n4Uwd37dbqMQ7KRhFkex_P_JSeVA';

export const supabase = createClient(supabaseUrl, supabaseKey);