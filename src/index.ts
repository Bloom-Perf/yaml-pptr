import * as p from "puppeteer";
import { parseYaml } from "./yaml/parser";
import { evalScenario } from "./puppet/interpreter";
import { toDomain } from "./yaml/resolver";

export const readYamlAndInterpret = (yaml: string) => {
    const rootYaml = parseYaml(yaml);
    const root = toDomain(rootYaml);

    return async (b: p.Browser) => {

        return Promise.all(root.scenarios.map(async scenario => {
            const page = await b.newPage();
            await evalScenario(page, scenario);
        }))
    };
}