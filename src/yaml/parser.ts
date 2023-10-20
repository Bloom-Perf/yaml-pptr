import * as yaml from "js-yaml";
import { rootZod } from "./validator";

export const parseYaml = (str: string) => {
    const yamlStructure = yaml.load(str);
    return rootZod.parse(yamlStructure);
}