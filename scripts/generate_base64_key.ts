
import fs from 'fs';
import path from 'path';

const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

try {
    if (!fs.existsSync(serviceAccountPath)) {
        console.error(`Error: File not found at ${serviceAccountPath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(serviceAccountPath, 'utf-8');
    const json = JSON.parse(content);
    const privateKey = json.private_key;

    if (!privateKey) {
        console.error("Error: 'private_key' not found in firebase-service-account.json");
        process.exit(1);
    }

    // Encode to Base64
    const base64Key = Buffer.from(privateKey).toString('base64');

    console.log("BASE64_KEY_START");
    console.log(base64Key);
    console.log("BASE64_KEY_END");

} catch (error) {
    console.error("Error processing key:", error);
}
