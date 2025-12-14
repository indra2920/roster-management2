import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// --- EXACT COPY OF CREDENTIALS FROM AUTH.TS ---
const PROJECT_ID = "roster-f1cb8";
const CLIENT_EMAIL = "firebase-adminsdk-fbsvc@rooster-f1cb8.iam.gserviceaccount.com";
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
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
wR6z06pXPoa7k2m+ljB7DsrV/kj2a/0xF3uOGXnw/wF8x+cH2LcdaMAJ8KcGwtiY
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

const APP_NAME = 'DEBUG_AUTH_TESTER';

// Initialize (or reuse)
const getDebugDb = () => {
    const existingApp = getApps().find((a: any) => a.name === APP_NAME);
    if (existingApp) return getFirestore(existingApp);

    try {
        const app = initializeApp({
            credential: cert({ projectId: PROJECT_ID, clientEmail: CLIENT_EMAIL, privateKey: PRIVATE_KEY })
        }, APP_NAME);
        return getFirestore(app);
    } catch (e) {
        throw e;
    }
};

export async function GET() {
    const start = Date.now();
    try {
        const db = getDebugDb();
        // Mimic the Auth Query: Get 1 User
        const snapshot = await db.collection('users').limit(1).get();

        return NextResponse.json({
            status: 'SUCCESS',
            count: snapshot.size,
            duration: Date.now() - start,
            credentials: {
                pid: PROJECT_ID,
                email: CLIENT_EMAIL,
                keyLen: PRIVATE_KEY.length
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'ERROR',
            code: error.code,
            message: error.message,
            duration: Date.now() - start,
            credentials: {
                pid: PROJECT_ID,
                keyLen: PRIVATE_KEY.length
            }
        }, { status: 500 });
    }
}
