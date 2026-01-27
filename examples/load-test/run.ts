import { readYamlAndInterpret } from '../../src/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const yamlPath = path.join(__dirname, 'scenario.yaml');
  const yamlContent = fs.readFileSync(yamlPath, 'utf-8');

  console.log('Starting load test (3 workers x 2 iterations = 6 runs)...\n');

  const startTime = Date.now();

  try {
    await readYamlAndInterpret(yamlContent);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nLoad test completed in ${duration}s`);
  } catch (error) {
    console.error('Load test failed:', error);
    process.exit(1);
  }
}

main();
