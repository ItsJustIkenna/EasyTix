/**
 * Next.js Instrumentation Hook
 * This runs once when the server starts
 * Perfect place for environment validation
 */

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only validate on Node.js runtime (not Edge)
    const { validateEnv } = require('./lib/env');
    
    try {
      validateEnv();
    } catch (error) {
      // Re-throw to prevent server from starting with invalid config
      throw error;
    }
  }
}
