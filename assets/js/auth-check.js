import { supabase } from './supabaseClient.js';
import { logError } from './error-logger.js';

/**
 * Checks if a user has a specific role.
 * @param {string} userId - The UUID of the user.
 * @param {string|string[]} requiredRole - The role (or array of roles) to check for.
 * @returns {Promise<boolean>}
 * 
 * Documentation:  https://github.com/hawthorneguild/HawthorneTeams/issues/17
 */
export async function checkAccess(userId, requiredRole) {
    if (!userId) {
        logError('auth-check', 'checkAccess: No userId provided');
        return false;
    }

    try {
        const { data, error } = await supabase
            .from('discord_users')
            .select('roles')
            .eq('user_id', userId)
            .single();

        if (error) {
            logError('auth-check', `checkAccess: DB error for user ${userId}: ${error.message}`);
            return false;
        }
        
        if (!data) {
            logError('auth-check', `checkAccess: No data found for user ${userId}`);
            return false;
        }
        
        if (!data.roles) {
            logError('auth-check', `checkAccess: No roles found for user ${userId}`);
            return false;
        }

        // Handle single string or array of required roles
        // If we pass an array (e.g. ['Admin', 'Mod']), we check if they have ANY of them.
        const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        
        // "Does the user's role list include any of the required roles?"
        const hasPermission = required.some(r => data.roles.includes(r));
        
        logError('auth-check', `checkAccess: User ${userId} has roles ${JSON.stringify(data.roles)}, required ${JSON.stringify(required)}, access=${hasPermission}`);
        return hasPermission;

    } catch (e) {
        logError('auth-check', `checkAccess: Exception for user ${userId}: ${e.message}`);
        return false;
    }
}