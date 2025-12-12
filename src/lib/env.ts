import { z } from 'zod';

const envSchema = z.object({
    // Firebase Admin Configuration (Required for Vercel/Production)
    FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is missing"),
    FIREBASE_CLIENT_EMAIL: z.string().min(1, "FIREBASE_CLIENT_EMAIL is missing").email("FIREBASE_CLIENT_EMAIL must be a valid email"),
    FIREBASE_PRIVATE_KEY: z.string().min(1, "FIREBASE_PRIVATE_KEY is missing"),

    // NextAuth Configuration
    NEXTAUTH_URL: z.string().url().optional(),
    NEXTAUTH_SECRET: z.string().min(1).optional(),

    // Database
    DATABASE_URL: z.string().min(1, "DATABASE_URL is missing"),

    // Node Environment
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const processEnv = {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
};

// Check if we are in the browser to avoid leaking secrets
const isServer = typeof window === 'undefined';

let env = process.env as z.infer<typeof envSchema>;

if (isServer) {
    const parsed = envSchema.safeParse(processEnv);

    if (!parsed.success) {
        console.error(
            '❌ Invalid environment variables:',
            parsed.error.flatten().fieldErrors
        );
        throw new Error('Invalid environment variables. Check your .env file or Vercel settings.');
    }

    env = parsed.data as any;
}

export { env };
