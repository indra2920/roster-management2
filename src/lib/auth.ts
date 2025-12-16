import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { env } from "@/lib/env"

export const authOptions: NextAuthOptions = {
    debug: true,
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                console.log("[AUTH] Authorizing user:", credentials.email);

                try {
                    // Import dynamically or use the exported adminDb
                    // We use adminDb from lib/firebase-admin
                    const { adminDb } = await import("@/lib/firebase-admin");

                    const usersRef = adminDb.collection('users');
                    const snapshot = await usersRef.where('email', '==', credentials.email).limit(1).get();

                    if (snapshot.empty) {
                        console.log("[AUTH] User not found");
                        return null;
                    }

                    const userDoc = snapshot.docs[0];
                    const userData = userDoc.data();

                    // DIRECT PLAIN TEXT PASSWORD CHECK (Based on current implementation)
                    // TODO: Implement bcrypt in future
                    if (userData.password !== credentials.password) {
                        console.log("[AUTH] Invalid password");
                        return null;
                    }

                    // Check if active
                    if (userData.isActive === false) {
                        throw new Error("Account is inactive. Contact Admin.");
                    }

                    console.log("[AUTH] Success:", userData.email);

                    // Return user object mapped for NextAuth
                    return {
                        id: userDoc.id,
                        email: userData.email,
                        name: userData.name,
                        role: userData.role,
                        image: userData.photoUrl || null,
                        positionId: userData.positionId,
                        positionName: userData.positionName, // Ensure this exists or fetch it
                        locationId: userData.locationId,
                        regionId: userData.regionId
                    };

                } catch (error: any) {
                    console.error("[AUTH] Error:", error);
                    throw new Error(error.message);
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
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
