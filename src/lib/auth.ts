
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
// Removed adminDb and env to prevent conflicts with isolated auth app

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
                    // ISOLATION STRATEGY: Use a local, named Firebase App to avoid global conflicts
                    const { getApps, getApp, initializeApp, cert } = require('firebase-admin/app');
                    const { getFirestore } = require('firebase-admin/firestore');

                    // Parse Env Vars manually to be absolutely sure
                    // (Copying logic from firebase-admin.ts to ensure self-sufficiency)
                    const projectId = process.env.FIREBASE_PROJECT_ID;
                    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
                    let key = process.env.FIREBASE_PRIVATE_KEY || "";

                    if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
                        try { key = Buffer.from(key, 'base64').toString('utf-8'); }
                        catch (e) { }
                    }
                    if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
                    const privateKey = key.replace(/\\n/g, '\n').replace(/\r/g, '').trim();

                    const APP_NAME = 'AUTH_WORKER';
                    let authApp;

                    if (getApps().find((a: any) => a.name === APP_NAME)) {
                        authApp = getApp(APP_NAME);
                    } else {
                        console.log("[AUTH] Initializing isolated AUTH_WORKER app...");
                        authApp = initializeApp({
                            credential: cert({ projectId, clientEmail, privateKey })
                        }, APP_NAME);
                    }

                    const db = getFirestore(authApp);
                    const usersRef = db.collection('users');
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
                            // Don't block login if position fetch fails, just log it
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
                    const debugInfo = `[KeyLen:${env.FIREBASE_PRIVATE_KEY?.length} Email:${env.FIREBASE_CLIENT_EMAIL} PID:${env.FIREBASE_PROJECT_ID}]`;

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
