// Writes dist/schema.json (run by `npm run build`, after the bundle).
import * as fs from 'node:fs';
import { buildJsonSchema } from '../src/yaml/json-schema.js';

const output = 'dist/schema.json';
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync(output, JSON.stringify(buildJsonSchema(), null, 2) + '\n');
console.log(`${output} written`);
