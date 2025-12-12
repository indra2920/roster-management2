
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
const outputPath = path.join(process.cwd(), 'scripts', 'key.txt');

try {
    if (!fs.existsSync(serviceAccountPath)) {
        console.error(`Error: File not found at ${serviceAccountPath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(serviceAccountPath, 'utf-8');
    const json = JSON.parse(content);
    const privateKey = json.private_key;

    if (!privateKey) {
        console.error("Error: 'private_key' not found");
        process.exit(1);
    }

    const base64Key = Buffer.from(privateKey).toString('base64');
    fs.writeFileSync(outputPath, base64Key);
    console.log("Key saved to scripts/key.txt");

} catch (error) {
    console.error("Error:", error);
}
