// ===========================
// Supabase Configuration
// ===========================
// Replace these values with your Supabase project config
// Go to: Supabase Dashboard > Project Settings > API

const SUPABASE_URL = 'https://psiaidwpvlkynjkktpvh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzaWFpZHdwdmxreW5qa2t0cHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzQ3MzUsImV4cCI6MjA4NDUxMDczNX0.o9n1dcdITnnT0fXgEgRiEfxoohpXa3BGMqyRg1SFTwY';

// Initialize Supabase client
let supabase = null;

function initializeSupabase() {
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase initialized successfully');
        return true;
    } catch (error) {
        console.error('Supabase initialization failed:', error);
        return false;
    }
}

// Check if Supabase is configured
function isSupabaseConfigured() {
    return SUPABASE_URL !== 'https://psiaidwpvlkynjkktpvh.supabase.co' &&
        SUPABASE_ANON_KEY !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzaWFpZHdwdmxreW5qa2t0cHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzQ3MzUsImV4cCI6MjA4NDUxMDczNX0.o9n1dcdITnnT0fXgEgRiEfxoohpXa3BGMqyRg1SFTwY';
}
