
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { adminDb } from "@/lib/firebase-admin"

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                try {
                    // Query Firestore for user by email
                    const usersRef = adminDb.collection('users');
                    const snapshot = await usersRef.where('email', '==', credentials.email).limit(1).get();

                    if (snapshot.empty) {
                        return null;
                    }

                    const userDoc = snapshot.docs[0];
                    const user = userDoc.data();
                    const userId = userDoc.id; // Use Doc ID as User ID

                    // Check if user is active
                    if (!user.isActive) {
                        throw new Error('Akun Anda belum diaktifkan oleh manager')
                    }

                    // Verify password (in real app use bcrypt)
                    if (user.password === credentials.password) {

                        // Fetch Position Name manually if positionId exists
                        let positionName = undefined;
                        if (user.positionId) {
                            const positionDoc = await adminDb.collection('positions').doc(user.positionId).get();
                            if (positionDoc.exists) {
                                positionName = positionDoc.data()?.name;
                            }
                        }

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
                    }
                } catch (error) {
                    console.error("Auth Error:", error);
                    return null;
                }

                return null
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
                session.user.role = token.role
                session.user.id = token.id
                session.user.positionId = token.positionId
                session.user.positionName = token.positionName
                session.user.locationId = token.locationId
                session.user.regionId = token.regionId
            }
            return session
        }
    },
    pages: {
        signIn: '/login',
    },
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        },
    },
}
