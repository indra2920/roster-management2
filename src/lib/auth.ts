
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { adminDb } from "@/lib/firebase-admin"

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
                const startTime = Date.now();

                if (!credentials?.email || !credentials?.password) {
                    console.log("[AUTH] Missing credentials");
                    return null
                }

                try {
                    // Query Firestore for user by email
                    console.log("[AUTH] Querying Firestore...");
                    const usersRef = adminDb.collection('users');
                    const snapshot = await usersRef.where('email', '==', credentials.email).limit(1).get();
                    console.log(`[AUTH] Firestore query took ${Date.now() - startTime}ms`);

                    if (snapshot.empty) {
                        console.log("[AUTH] User not found");
                        return null;
                    }

                    const userDoc = snapshot.docs[0];
                    const user = userDoc.data();
                    const userId = userDoc.id; // Use Doc ID as User ID
                    console.log("[AUTH] User found:", userId, user.role);

                    // Check if user is active
                    if (!user.isActive) {
                        console.log("[AUTH] User inactive");
                        throw new Error('Akun Anda belum diaktifkan oleh manager')
                    }

                    // Verify password (in real app use bcrypt)
                    if (user.password === credentials.password) {

                        // Fetch Position Name manually if positionId exists
                        let positionName = undefined;
                        if (user.positionId) {
                            try {
                                const posStartTime = Date.now();
                                const positionDoc = await adminDb.collection('positions').doc(user.positionId).get();
                                console.log(`[AUTH] Position fetch took ${Date.now() - posStartTime}ms`);
                                if (positionDoc.exists) {
                                    positionName = positionDoc.data()?.name;
                                }
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
                    } else {
                        console.log("[AUTH] Invalid password");
                        return null;
                    }
                } catch (error: any) {
                    console.error("[AUTH] Auth Error:", error);
                    if (error.message === 'Akun Anda belum diaktifkan oleh manager') {
                        throw error;
                    }
                    return null;
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
