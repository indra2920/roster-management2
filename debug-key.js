const dotenv = require('dotenv');
const { cert } = require('firebase-admin/app');
const crypto = require('crypto');

dotenv.config();

function debugKey() {
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;
    console.log("Original Key Length:", rawKey ? rawKey.length : "undefined");

    if (!rawKey) {
        console.error("No FIREBASE_PRIVATE_KEY found");
        return;
    }

    // Logic from src/lib/firebase-admin.ts
    let key = rawKey;
    if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
        try {
            console.log("Attempting Base64 decode...");
            key = Buffer.from(key, 'base64').toString('utf-8');
            console.log("Decoded Key Length:", key.length);
        } catch (e) {
            console.warn("Base64 decode failed");
        }
    } else {
        console.log("Key has header, skipping Base64 decode");
    }

    if (key.startsWith('"') && key.endsWith('"')) {
        key = key.slice(1, -1);
    }
    const processedKey = key.replace(/\\n/g, '\n').replace(/\r/g, '').trim();

    console.log("\n--- Processed Key Analysis ---");
    console.log("Length:", processedKey.length);

    const serviceAccount = {
        projectId: 'test-project',
        clientEmail: 'test@example.com',
        privateKey: processedKey,
    };

    try {
        cert(serviceAccount);
        console.log("\nSUCCESS: Original processed key parsed successfully!");
    } catch (e) {
        console.error("\nFAILURE: Original processed key failed:", e.message);

        // Try aggressive cleaning
        console.log("\nAttempting aggressive cleaning...");
        const header = "-----BEGIN PRIVATE KEY-----";
        const footer = "-----END PRIVATE KEY-----";
        let cleanKey = processedKey;
        if (processedKey.includes(header) && processedKey.includes(footer)) {
            const body = processedKey.substring(
                processedKey.indexOf(header) + header.length,
                processedKey.lastIndexOf(footer)
            );
            // Remove ALL whitespace
            const cleanBody = body.replace(/\s/g, '');
            // Re-wrap 
            const chunkedBody = cleanBody.match(/.{1,64}/g).join('\n');
            cleanKey = header + '\n' + chunkedBody + '\n' + footer;
        }

        const aggressiveServiceAccount = {
            projectId: 'test-project',
            clientEmail: 'test@example.com',
            privateKey: cleanKey,
        };

        try {
            cert(aggressiveServiceAccount);
            console.log("SUCCESS: Aggressively cleaned key parsed successfully!");
        } catch (e2) {
            console.error("FAILURE: Aggressively cleaned key also failed:", e2.message);
        }

        // Test with raw crypto
        try {
            const privKey = crypto.createPrivateKey(cleanKey);
            console.log("SUCCESS: Node crypto.createPrivateKey parsed the cleaned key!");
            console.log("Key Type:", privKey.asymmetricKeyType);
        } catch (e3) {
            console.error("FAILURE: Node crypto.createPrivateKey also failed:", e3.message);
        }
    }
}

debugKey();
