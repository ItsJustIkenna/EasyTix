/**
 * Environment variable validation
 * Validates required environment variables at startup to fail fast
 */

const requiredEnvVars = {
  // Database
  DATABASE_URL: 'PostgreSQL database connection string',
  
  // Authentication
  NEXTAUTH_URL: 'Application base URL',
  NEXTAUTH_SECRET: 'NextAuth secret for JWT signing',
  
  // Stripe
  STRIPE_SECRET_KEY: 'Stripe secret key',
  STRIPE_WEBHOOK_SECRET: 'Stripe webhook signing secret',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'Stripe publishable key (client-side)',
  
  // Email
  RESEND_API_KEY: 'Resend API key for email sending',
  FROM_EMAIL: 'Sender email address',
} as const;

const optionalEnvVars = {
  NEXT_PUBLIC_APP_URL: 'Application URL (defaults to localhost)',
  SENTRY_DSN: 'Sentry DSN for error tracking',
  SENTRY_PROJECT: 'Sentry project name',
} as const;

export function validateEnv(): void {
  const missing: string[] = [];
  const invalid: string[] = [];

  // Check required variables
  for (const [key, description] of Object.entries(requiredEnvVars)) {
    const value = process.env[key];
    
    if (!value || value.trim() === '') {
      missing.push(`${key} - ${description}`);
      continue;
    }

    // Additional validation for specific variables
    if (key === 'DATABASE_URL' && !value.startsWith('postgres')) {
      invalid.push(`${key} must be a valid PostgreSQL connection string`);
    }

    if (key === 'NEXTAUTH_SECRET' && value.length < 32) {
      invalid.push(`${key} must be at least 32 characters long`);
    }

    if (key === 'FROM_EMAIL' && !value.includes('@')) {
      invalid.push(`${key} must be a valid email address`);
    }

    if (key.includes('STRIPE') && key !== 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY') {
      if (!value.startsWith('sk_') && !value.startsWith('whsec_')) {
        invalid.push(`${key} appears to be invalid (should start with sk_ or whsec_)`);
      }
    }
  }

  // Report missing variables
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:\n');
    missing.forEach(msg => console.error(`  - ${msg}`));
    console.error('\n💡 Copy .env.example to .env and fill in the values.\n');
    throw new Error(`Missing ${missing.length} required environment variable(s)`);
  }

  // Report invalid variables
  if (invalid.length > 0) {
    console.error('\n⚠️  Invalid environment variables:\n');
    invalid.forEach(msg => console.error(`  - ${msg}`));
    console.error('');
    throw new Error(`${invalid.length} environment variable(s) have invalid values`);
  }

  // Log successful validation in development
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Environment variables validated successfully');
    
    // List optional variables that are set
    const optionalSet = Object.keys(optionalEnvVars).filter(
      key => process.env[key] && process.env[key]!.trim() !== ''
    );
    
    if (optionalSet.length > 0) {
      console.log(`📋 Optional variables configured: ${optionalSet.join(', ')}`);
    }
  }
}

/**
 * Get environment variable with fallback
 */
export function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  
  if (!value || value.trim() === '') {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Environment variable ${key} is not set and no fallback provided`);
  }
  
  return value;
}

/**
 * Check if environment is production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if environment is development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}
