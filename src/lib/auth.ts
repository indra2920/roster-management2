
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { adminDb } from "@/lib/firebase-admin"
import { env } from "@/lib/env"

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
                // DEBUG: Inspect the key being used
                const debugKey = env.FIREBASE_PRIVATE_KEY || 'MISSING';
                const keyInfo = `Len:${debugKey.length} Start:${debugKey.substring(0, 5)}...`;

                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Missing credentials");
                }

                try {
                    // Use the Singleton adminDb that we know works in test-db
                    const usersRef = adminDb.collection('users');
                    const snapshot = await usersRef.where('email', '==', credentials.email).limit(1).get();

                    if (snapshot.empty) {
                        throw new Error(`User tidak ditemukan. (Key: ${keyInfo})`);
                    }

                    const userDoc = snapshot.docs[0];
                    const user = userDoc.data();
                    const userId = userDoc.id; // Use Doc ID as User ID
                    console.log("[AUTH] User found:", userId, user.role);

                    // Check if user is active
                    if (!user.isActive) {
                        console.log("[AUTH] User inactive");
                        throw new Error('Akun Anda belum diaktifkan oleh manager');
                    }

                    // Verify password (in real app use bcrypt)
                    if (user.password !== credentials.password) {
                        console.log("[AUTH] Invalid password. DB:", user.password, "Input:", credentials.password);
                        throw new Error('Password salah');
                    }

                    // Fetch Position Name manually if positionId exists
                    let positionName = undefined;
                    if (user.positionId) {
                        try {
                            const positionDoc = await adminDb.collection('positions').doc(user.positionId).get();
                            if (positionDoc.exists) {
                                positionName = positionDoc.data()?.name;
                            }
                        } catch (posError) {
                            console.error("[AUTH] Failed to fetch position:", posError);
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
