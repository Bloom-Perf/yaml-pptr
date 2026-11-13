import * as yaml from 'js-yaml';
import { rootZod, RootYaml } from './validator.js';

export const parseYaml = (yamlContent: string): RootYaml => {
    const yamlStructure = yaml.load(yamlContent);
    return rootZod.parse(yamlStructure);
};
