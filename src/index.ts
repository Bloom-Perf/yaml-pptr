import * as p from "puppeteer";
import { parseYaml } from "./yaml/parser";
import { evalScenario } from "./puppet/interpreter";
import { Resolver } from "./yaml/resolver";
import { YpLogger, dumbLogger } from "./core/logger";

export const readYamlAndInterpret = (yaml: string, logger: YpLogger = dumbLogger) => {
    const rootYaml = parseYaml(yaml);

    const domainResolver = new Resolver((envVarName: string) => {
        const envVarValue = process.env[envVarName];

        logger.debug(`Resolving env variable "${envVarName}" with value ***`)
        if (envVarValue) return envVarValue;

        throw new Error(`Tried to resolve env variable ${envVarName} but was empty.`);
    }, logger);

    const root = domainResolver.resolve(rootYaml);

    return async (b: p.Browser, setupPage: (page: p.Page) => Promise<void> = (_) => Promise.resolve()) => {
        return Promise.all(root.scenarios.map(async scenario => {
            const page = await b.newPage();
            await setupPage(page);
            await evalScenario(b, scenario);
        }))
    };
}