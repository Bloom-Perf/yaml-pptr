import * as z from 'zod';
import { rootZod } from './validator.js';

/**
 * JSON Schema (draft 2020-12) of the YAML configuration, generated from the
 * zod schema used at runtime, so both always agree. Published as
 * `dist/schema.json` for editors (completion, hover documentation, validation).
 */
export const buildJsonSchema = (): Record<string, unknown> => {
    const { $schema, ...schema } = z.toJSONSchema(rootZod, { target: 'draft-2020-12', io: 'input' });
    return {
        $schema,
        title: 'yaml-pptr scenarios',
        description: 'Scenarios run by @bloom-perf/yaml-pptr — https://github.com/Bloom-Perf/yaml-pptr',
        ...schema,
    };
};
