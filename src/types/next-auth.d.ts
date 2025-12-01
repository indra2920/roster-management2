import { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: string
            positionId?: string | null
            positionName?: string | null
            locationId?: string | null
            regionId?: string | null
        } & DefaultSession["user"]
    }

    interface User {
        id: string
        role: string
        positionId?: string | null
        positionName?: string | null
        locationId?: string | null
        regionId?: string | null
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: string
        positionId?: string | null
        positionName?: string | null
        locationId?: string | null
        regionId?: string | null
    }
}
