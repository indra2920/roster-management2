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

                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Missing credentials");
                }

                try {
                    // Use the Singleton adminDb that we know works in test-db
                    const usersRef = adminDb.collection('users');
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
                            const positionDoc = await adminDb.collection('positions').doc(user.positionId).get();
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
