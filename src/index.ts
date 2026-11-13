// src/index.ts
import * as p from 'puppeteer';
import { SupportedBrowser, OnPageCallback, Scenario } from './core/model.js';
import { parseYaml } from './yaml/parser.js';
import { Resolver } from './yaml/resolver.js';
import { evalScenario } from './puppet/interpreter.js';
import { launchBrowser } from './puppet/launcher.js';
import { YpLogger, dumbLogger } from './core/logger.js';
import { BrowserLaunchError } from './core/errors.js';

export type { ScenarioContext, OnPageCallback } from './core/model.js';
export { WorkerError, BrowserLaunchError } from './core/errors.js';

export type ReadYamlOptions = {
    /** Already launched browsers to use instead of launching new ones. They are not closed. */
    browsers?: { [key in SupportedBrowser]?: p.Browser };
    logger?: YpLogger;
    onPage?: OnPageCallback;
    /** Run launched browsers in headless mode. Defaults to `true`. */
    headless?: boolean;
    /** Extra Puppeteer launch options per browser (e.g. `executablePath`). `args` are appended to the defaults. */
    launchOptions?: { [key in SupportedBrowser]?: p.LaunchOptions };
};

/**
 * Parses the YAML, then runs every scenario. Scenarios targeting different
 * browsers run in parallel; scenarios sharing a browser run one after another.
 *
 * All scenarios are always run to completion. If anything failed (browser
 * launch or worker), the promise rejects with an `AggregateError` whose
 * `errors` are `BrowserLaunchError` / `WorkerError` instances.
 */
export const readYamlAndInterpret = async (
    yamlContent: string,
    options: ReadYamlOptions = {}
): Promise<void> => {
    const { browsers = {}, logger = dumbLogger, onPage, headless = true, launchOptions = {} } = options;

    const rootYaml = parseYaml(yamlContent);

    const domainResolver = new Resolver((envVarName: string) => {
        const envVarValue = process.env[envVarName];

        logger.debug(`Resolving env variable "${envVarName}" with value ***`);
        if (envVarValue) return envVarValue;

        throw new Error(`Tried to resolve env variable ${envVarName} but was empty.`);
    }, logger);

    const root = domainResolver.resolve(rootYaml);

    const scenariosByBrowser = new Map<SupportedBrowser, Scenario[]>();
    for (const scenario of root.scenarios) {
        const list = scenariosByBrowser.get(scenario.browser) ?? [];
        list.push(scenario);
        scenariosByBrowser.set(scenario.browser, list);
    }

    const errors: unknown[] = [];

    const runOnBrowser = async (browserName: SupportedBrowser, scenarios: Scenario[]): Promise<void> => {
        let browser = browsers[browserName];
        const shouldClose = !browser;

        if (!browser) {
            try {
                logger.info(`Launching ${browserName} (headless: ${headless})`);
                browser = await launchBrowser(browserName, headless, launchOptions[browserName]);
            } catch (e) {
                const error = new BrowserLaunchError(browserName, e);
                logger.error(error.message);
                errors.push(error);
                return;
            }
        }

        try {
            for (const scenario of scenarios) {
                try {
                    await evalScenario(browser, scenario, logger, onPage);
                } catch (e) {
                    errors.push(...(e instanceof AggregateError ? e.errors : [e]));
                }
            }
        } finally {
            if (shouldClose) {
                await browser.close().catch(e => logger.warn(`Failed to close ${browserName}: ${e}`));
            }
        }
    };

    await Promise.all([...scenariosByBrowser].map(([name, scenarios]) => runOnBrowser(name, scenarios)));

    if (errors.length > 0) {
        throw new AggregateError(errors, `${errors.length} error(s) occurred while running scenarios`);
    }
};
