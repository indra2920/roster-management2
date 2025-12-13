
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.log("Error loading .env:", result.error);
} else {
    console.log(".env loaded successfully");
}

console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID ? "Set" : "Not Set");
console.log("FIREBASE_PRIVATE_KEY:", process.env.FIREBASE_PRIVATE_KEY ? "Set (Length: " + process.env.FIREBASE_PRIVATE_KEY.length + ")" : "Not Set");
