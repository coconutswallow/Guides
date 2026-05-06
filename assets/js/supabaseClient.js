/**
 * supabase-config.js
 * Reusable asset for the Supabase connection.
 * Automatically switches between Test and Production databases based on environment.
 * Location: \assets\js\supabaseClient.js
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const ENV_CONFIGS = {
    // TEST / DEV (Local or personal fork)
    test: {
        url: 'https://kcbvryvmcbfpsibxthhn.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjYnZyeXZtY2JmcHNpYnh0aGhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTk1MzIsImV4cCI6MjA3OTE3NTUzMn0.9h81WHRCJfhouquG9tPHliY_5ezAbzKeDoLtGSARo5M'
    },
    // PRODUCTION (Main site)
    prod: {
        url: 'https://iepqxczcyvrxcbyeiscc.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllcHF4Y3pjeXZyeGNieWVpc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNjU2MDEsImV4cCI6MjA3OTk0MTYwMX0.9fK4TppNy7IekO3n4Uwd37dbqMQ7KRhFkex_P_JSeVA'
    }
};

const hostname = window.location.hostname;
const isProd = hostname === 'hawthorneguild.github.io';
const config = isProd ? ENV_CONFIGS.prod : ENV_CONFIGS.test;

console.log(`[Supabase] Connecting to ${isProd ? 'Production' : 'Test/Local'} database...`);

export const supabase = createClient(config.url, config.key);
