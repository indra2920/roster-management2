import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
// Removed adminDb and env to prevent conflicts with isolated auth app

// Module-scope initialization (Clean & Stable like firebase-admin.ts)
const initAuthFirebase = () => {
    const { getApps, getApp, initializeApp, cert } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');

    const APP_NAME = 'AUTH_WORKER_V2'; // New name to ensure fresh start

    // Check if app already exists at module load
    const existingApp = getApps().find((a: any) => a.name === APP_NAME);
    if (existingApp) {
        console.log("[AUTH] Re-using module-level AUTH_WORKER app");
        return getFirestore(existingApp);
    }

    console.log("[AUTH] Initializing module-level AUTH_WORKER app...");

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let key = process.env.FIREBASE_PRIVATE_KEY || "";

    if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
        try { key = Buffer.from(key, 'base64').toString('utf-8'); } catch (e) { }
    }
    if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
    const privateKey = key.replace(/\\n/g, '\n').replace(/\r/g, '').trim();

    try {
        const authApp = initializeApp({
            credential: cert({ projectId, clientEmail, privateKey })
        }, APP_NAME);
        return getFirestore(authApp);
    } catch (error) {
        console.error("[AUTH] Init Failed:", error);
        throw error;
    }
};

// Initialize ONCE at module level
const authDb = initAuthFirebase();

export const authOptions: NextAuthOptions = {
    debug: true, // Enable debug logs
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                console.log("[AUTH] Authorize called with email:", credentials?.email);

                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Missing credentials");
                }

                try {
                    // Use the module-scoped DB instance
                    const usersRef = authDb.collection('users');
                    const snapshot = await usersRef.where('email', '==', credentials.email).limit(1).get();

                    if (snapshot.empty) {
                        throw new Error(`User tidak ditemukan.`);
                    }

                    const user = snapshot.docs[0].data();
                    const userId = snapshot.docs[0].id;

                    if (!user.isActive) throw new Error('Akun belum aktif');
                    if (user.password !== credentials.password) throw new Error('Password salah');

                    // Position fetch (using same isolated db)
                    let positionName = undefined;
                    if (user.positionId) {
                        try {
                            const positionDoc = await authDb.collection('positions').doc(user.positionId).get();
                            if (positionDoc.exists) positionName = positionDoc.data()?.name;
                        } catch (posError) {
                            console.error("[AUTH] Failed to fetch position:", posError);
                        }
                    }

                    console.log("[AUTH] Login successful for:", user.email);
                    return {
                        id: userId,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        positionId: user.positionId,
                        positionName: positionName,
                        locationId: user.locationId,
                        regionId: user.regionId,
                    }

                } catch (error: any) {
                    console.error("[AUTH] Auth Error:", error);
                    // Debug info
                    const kLen = process.env.FIREBASE_PRIVATE_KEY?.length || 0;
                    const debugInfo = `[KeyLen:${kLen} PID:${process.env.FIREBASE_PROJECT_ID}]`;

                    // Throw the specific error so it reaches the client with DEBUG INFO
                    throw new Error(`${error.message} ${debugInfo}`);
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                console.log("[AUTH] JWT Callback - Setting User Data");
                token.role = user.role
                token.id = user.id
                token.positionId = user.positionId
                token.positionName = user.positionName
                token.locationId = user.locationId
                token.regionId = user.regionId
            }
            return token
        },
        async session({ session, token }) {
            if (session?.user) {
                // console.log("[AUTH] Session Callback"); 
                session.user.role = token.role as any
                session.user.id = token.id as string
                session.user.positionId = token.positionId as string
                session.user.positionName = token.positionName as string
                session.user.locationId = token.locationId as string
                session.user.regionId = token.regionId as string
            }
            return session
        }
    },
    pages: {
        signIn: '/login',
    },
}
