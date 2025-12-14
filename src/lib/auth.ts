import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { env } from "@/lib/env"

// Module-scope initialization (Clean & Stable like firebase-admin.ts)
const initAuthFirebase = () => {
    const { getApps, getApp, initializeApp, cert } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');

    const APP_NAME = 'AUTH_WORKER_HARDCODED';

    const existingApp = getApps().find((a: any) => a.name === APP_NAME);
    if (existingApp) {
        return getFirestore(existingApp);
    }

    // HARDCODED CREDENTIALS (To bypass stale Vercel Env Vars)
    // Taken from proven-working test-db output
    const projectId = "roster-f1cb8";
    const clientEmail = "firebase-adminsdk-fbsvc@rooster-f1cb8.iam.gserviceaccount.com";

    // We still have to trust the Key from Env, but let's try to clean it
    let key = process.env.FIREBASE_PRIVATE_KEY || "";
    if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
        try { key = Buffer.from(key, 'base64').toString('utf-8'); } catch (e) { }
    }
    if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
    const privateKey = key.replace(/\\n/g, '\n').replace(/\r/g, '').trim();

    console.log(`[AUTH] Hardcoded Init. PID:${projectId} Email:${clientEmail} KeyLen:${privateKey.length}`);

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

// Lazy Initialization Wrapper
let authDbInstance: any = null;

const getAuthDb = () => {
    if (authDbInstance) return authDbInstance;

    console.log("[AUTH] Initializing AuthDB (Lazy)...");

    const { getApps, initializeApp, cert } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');

    const APP_NAME = 'AUTH_WORKER_HARDCODED';

    // Check if app exists
    const existingApp = getApps().find((a: any) => a.name === APP_NAME);
    if (existingApp) {
        console.log("[AUTH] Reusing existing app instance");
        authDbInstance = getFirestore(existingApp);
        return authDbInstance;
    }

    // HARDCODED CREDENTIALS
    const projectId = "roster-f1cb8";
    const clientEmail = "firebase-adminsdk-fbsvc@rooster-f1cb8.iam.gserviceaccount.com";

    // NUCLEAR OPTION: HARDCODED PRIVATE KEY
    const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCpSd7PfQUBIJQ1
c2x5rWq7Q9vWOeZOuFW2KSlYHBY7f4ZaEW7gtdOntU6PBJGOfQEvcn0K4dgq6dBM
DZtWTuu6R8koDmsvhoFf/yDqAoxkqNnSo0V/o7oOeZ9VCooh516bZnIO3nQa8OcT
Urr9gvDpdVYqyzpL2hRJ9GnN/0e8DyvgSQ1KM97YhBFeR5PEHxV0Mp26PxXCwNfu
QM9ZelQnoyeCPxTaxQAuIMX0rz1xRdOpF9OUNrvubDMd6ZXNoDigsRckkgKvMsse
J3tUHuZ6grvcge/mrVDG8aYNjwQXLsJe9o0Drh8VlHsSyWB89RrUJRf9sKoKHp8i
Z3xE33cbAgMBAAECggEADv8h7i7nZEEsP/aYqR10CLYrNwrBXJSMgJWcOaz19JFd
0oQcLBXkyRo7pQRvlzglrxFXrcDHXeMr9lYiPlQWzSq80X/tfjP5KWA4MeLF6HOO
JaXHFgE9YzjiT4NJLKsKwNN4zoO7CgPwmc/zYVqEgvnyXITNBkPXFkdrnrm6821z
wEbbX9T5hSTa1bi1ZDGQq3eb1x5XS2sk8N8aBRK+nYLNnj35l+HWYV4yYpsCoAIr
luJ3SbXWwzdNW2Pm6TcjuB1P5EUKwqukoqw4do/Q8rcUqxr6zsoOzEup+PJsAW11
sT7RvUzhXzeuGIuqKNhxQIcQJXgiF03JlKb6DpkFCQKBgQDQ3bDjTh72GQp6p37M
4ont89ynN+omSV8nMeiGQQFnEKVJTUIkFF2Q9c1i8PGXoA0NHT3fFVuZ/M3bNnxF
vSSfX9ERXbzJOhLhifSwBIaEeospzFsQdpqGXnWyztngO8uVr2VOWH5SIyQcjgHK
sYI+3/m+NtZifAMepXOYgjRHzwKBgQDPfcTCYCHXxCWtWnSBs1+GuuVrV9S/ifin
wR6z06pXPoa7k2m+ljB7DsrV/kj2a/0xF3uOGXnw/0F8x+cH2LcdaMAJ8KcGwtiY
+WrJ5RCBDHHUI2wPu1lnmvtX0+g7v5KKtYMmWjsLZU3BcV+uaBOQ4FPUVkQkKDWn
vhXqEe7i9QKBgQDJTaF6soRstF3BMUWoun4tdOep0t494GFxKUzueCCd8REcwPWK
SIaVfBJj1c1DUeLCTPig1bjfhSPyr2S+4jk10edyUWHun6Yq8gd+zh3H+UO/GVJ7
X5Q3BTtzBqI+1+KzdcSx6eB10aCwVL2tWcAqUTwm9DtT2Co5k0UCLBuvSQKBgQCA
mbfYrVJsc8LSZczuEmmzjKTi2gYfTPlTp+tKk3bxKezB14TjvhyAONPYvAkmyhmc
UqyejwW4K6UVXKTBhT1BOgpEXuZ21079ySC5z4JiKX9ndyjjuz+XakQ71DgMyBig
Zg3KOIR99KSzr3wZEaKG2bK7WVhUfKN8uuDEOacw/QKBgAEukmwg19uajkHska6i
ho66/aGqXVE47CqdhdYdD3ZfYeAKvjFQ6/eyjRISJA0B7FpelyyMwA+HWRzYzCOE
bwJL4+Cus+COgfqfdiFZWXVmQuUANm/fDTvHcLKdjlnTnjz64wPD2Ix2L4aZ9s53
/R31w/OV9PS75sBfdXO1m68y
-----END PRIVATE KEY-----`;

    console.log(`[AUTH] Hardcoded Init. PID:${projectId} KeyLen:${privateKey.length}`);

    try {
        const authApp = initializeApp({
            credential: cert({ projectId, clientEmail, privateKey })
        }, APP_NAME);
        authDbInstance = getFirestore(authApp);
        return authDbInstance;
    } catch (error) {
        console.error("[AUTH] Init Failed:", error);
        throw error;
    }
};

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
                    // Use the HARDCODED DB instance
                    const db = getAuthDb();
                    const usersRef = db.collection('users');
                    const snapshot = await usersRef.where('email', '==', credentials.email).limit(1).get();

                    if (snapshot.empty) {
                        throw new Error(`User tidak ditemukan.`);
                    }

                    const user = snapshot.docs[0].data();
                    const userId = snapshot.docs[0].id;

                    if (!user.isActive) throw new Error('Akun belum aktif');
                    if (user.password !== credentials.password) throw new Error('Password salah');

                    // Position fetch 
                    let positionName = undefined;
                    if (user.positionId) {
                        try {
                            const db = getAuthDb();
                            const positionDoc = await db.collection('positions').doc(user.positionId).get();
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
                    // Deep Debug Info
                    const kLen = env.FIREBASE_PRIVATE_KEY?.length || 0;
                    const pid = env.FIREBASE_PROJECT_ID;
                    const email = env.FIREBASE_CLIENT_EMAIL;
                    const debugInfo = `[KeyLen:${kLen} PID:${pid} Email:${email}]`;

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
