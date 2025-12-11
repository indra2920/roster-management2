
import * as fs from 'fs';
import * as path from 'path';

try {
    const configPath = path.resolve(process.cwd(), 'firebase-service-account.json');
    const content = fs.readFileSync(configPath, 'utf8');
    const json = JSON.parse(content);
    console.log('PID:' + json.project_id);
} catch (e) {
    console.error('FAIL');
}
