
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-service-account.json');

try {
    if (!fs.existsSync(configPath)) {
        console.error('File not found:', configPath);
        process.exit(1);
    }
    const content = fs.readFileSync(configPath, 'utf8');
    const json = JSON.parse(content);

    if (!json.project_id || !json.private_key || !json.client_email) {
        console.error('JSON is valid but missing required fields (project_id, private_key, client_email)');
        process.exit(1);
    }

    console.log('✅ firebase-service-account.json is valid and contains required fields.');
    console.log('PROJECT_ID_FROM_FILE:' + json.project_id);
    console.log('Client Email:', json.client_email);

} catch (error) {
    console.error('Failed to parse JSON:', error);
    process.exit(1);
}
