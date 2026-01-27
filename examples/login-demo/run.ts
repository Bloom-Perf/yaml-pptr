import { readYamlAndInterpret } from '../../src/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Read and execute scenario
  const yamlPath = path.join(__dirname, 'scenario.yaml');
  const yamlContent = fs.readFileSync(yamlPath, 'utf-8');

  console.log('Starting Sauce Demo login test...\n');

  try {
    await readYamlAndInterpret(yamlContent);
    console.log('\nTest completed! Screenshot saved to screenshots/inventory.png');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main();
