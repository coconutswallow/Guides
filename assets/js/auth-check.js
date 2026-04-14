import { supabase } from './supabaseClient.js';
import { logError } from './error-logger.js';

// In-memory cache for user roles to prevent redundant DB hits
const roleCache = new Map();

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
        logError('auth-check', 'checkAccess: No userId provided', 'warning');
        return false;
    }

    try {
        let roles = null;

        // 1. Check Cache first
        if (roleCache.has(userId)) {
            roles = roleCache.get(userId);
        } else {
            // 2. Fetch from DB
            const { data, error } = await supabase
                .from('discord_users')
                .select('roles')
                .eq('user_id', userId)
                .single();

            if (error) {
                logError('auth-check', `checkAccess: DB error for user ${userId}: ${error.message}`);
                return false;
            }

            if (!data || !data.roles) {
                logError('auth-check', `checkAccess: No roles found for user ${userId}`, 'warning');
                return false;
            }

            roles = data.roles;
            roleCache.set(userId, roles); // Cache the result
        }

        // Handle single string or array of required roles
        const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

        // "Does the user's role list include any of the required roles?"
        const hasPermission = required.some(r => roles.includes(r));

        // Use a less verbose log for cached hits if desired, but for now we keep info
        logError('auth-check', `checkAccess: User ${userId} has roles ${JSON.stringify(roles)}, required ${JSON.stringify(required)}, access=${hasPermission} (cached=${roleCache.has(userId)})`, 'info');
        
        return hasPermission;

    } catch (e) {
        logError('auth-check', `checkAccess: Exception for user ${userId}: ${e.message}`);
        return false;
    }
}