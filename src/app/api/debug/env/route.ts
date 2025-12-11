
import { NextResponse } from 'next/server';

export async function GET() {
    const envVars = {
        GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    };
    return NextResponse.json(envVars);
}
