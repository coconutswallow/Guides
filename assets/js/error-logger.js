import { supabase } from './supabaseClient.js'; //

let debugCache = null;
let errorCount = 0;
const MAX_ERRORS_PER_SESSION = 20; // Prevent spamming your DB

/**
 * Logs errors to the database if the system debug setting is "true".
 * @param {string} moduleName - The script/module name (e.g., 'auth-manager').
 * @param {string} errorMessage - The error details.
 */
export async function logError(moduleName, errorMessage) {
    // 1. Safety check to prevent log flooding
    if (errorCount >= MAX_ERRORS_PER_SESSION) return;

    try {
        // 2. Check Cache/SessionStorage for the "debug" setting
        if (debugCache === null) {
            const cachedValue = sessionStorage.getItem('hawt_debug_enabled');
            if (cachedValue !== null) {
                debugCache = (cachedValue === 'true');
            }
        }

        // 3. If not cached, fetch from 'system' table
        if (debugCache === null) {
            const { data, error: fetchError } = await supabase
                .from('system') //
                .select('Value')
                .eq('Setting', 'debug') //
                .single();

            if (fetchError) {
                console.error("Logger: Error fetching debug setting", fetchError);
                return;
            }

            debugCache = (data.Value === 'true'); //
            sessionStorage.setItem('hawt_debug_enabled', debugCache.toString());
        }

        // 4. Log to 'errors' table if debug is true
        if (debugCache === true) {
            const { error: insertError } = await supabase
                .from('errors') //
                .insert([
                    { 
                        module: moduleName, //
                        error: errorMessage //
                    }
                ]);

            if (insertError) {
                console.error("Logger: Failed to write to database", insertError);
            } else {
                errorCount++;
            }
        }
    } catch (err) {
        console.error("Logger: Critical failure", err);
    }
}