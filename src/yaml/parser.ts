import * as yaml from 'js-yaml';
import * as z from 'zod';
import { rootZod, RootYaml } from './validator.js';
import { ConfigurationError } from '../core/errors.js';

export const parseYaml = (yamlContent: string): RootYaml => {
    let yamlStructure: unknown;
    try {
        yamlStructure = yaml.load(yamlContent);
    } catch (e) {
        throw new ConfigurationError(`Invalid YAML syntax: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
    }

    const result = rootZod.safeParse(yamlStructure);
    if (!result.success) {
        throw new ConfigurationError(`Invalid scenario configuration:\n${z.prettifyError(result.error)}`, { cause: result.error });
    }
    return result.data;
};
