// src/index.ts
import * as p from 'puppeteer';
import { SupportedBrowser, OnPageCallback, OnBrowserCallback, Scenario } from './core/model.js';
import { parseYaml } from './yaml/parser.js';
import { Resolver } from './yaml/resolver.js';
import { evalScenario } from './puppet/interpreter.js';
import { launchBrowser } from './puppet/launcher.js';
import { YpLogger, dumbLogger } from './core/logger.js';
import { BrowserLaunchError } from './core/errors.js';

export type { ScenarioContext, OnPageCallback, OnBrowserCallback, SupportedBrowser } from './core/model.js';
export { WorkerError, BrowserLaunchError, ConfigurationError } from './core/errors.js';

export type ReadYamlOptions = {
    /** Already launched browsers to use instead of launching new ones. They are not closed. */
    browsers?: { [key in SupportedBrowser]?: p.Browser };
    logger?: YpLogger;
    onPage?: OnPageCallback;
    /**
     * Called once per browser the scenarios run in (launched or passed in `browsers`), before
     * they start in it: e.g. to monitor its processes. If it throws, the scenarios of this
     * browser do not run and the error is reported as a `BrowserLaunchError`.
     */
    onBrowser?: OnBrowserCallback;
    /** Run launched browsers in headless mode. Defaults to `true`. */
    headless?: boolean;
    /** Extra Puppeteer launch options per browser (e.g. `executablePath`). `args` are appended to the defaults. */
    launchOptions?: { [key in SupportedBrowser]?: p.LaunchOptions };
};

/**
 * Parses and validates the YAML, resolves environment variables, then runs
 * every scenario. All scenarios start at the same time (each one with its own
 * workers and start strategy), whatever the browser they target.
 *
 * - An invalid configuration (YAML syntax, unknown key, missing environment
 *   variable...) rejects with a `ConfigurationError` before anything runs.
 * - Otherwise all scenarios are always run to completion. If anything failed
 *   (browser launch or iteration), the promise rejects with an `AggregateError`
 *   whose `errors` are `BrowserLaunchError` / `WorkerError` instances, in
 *   scenario order.
 */
export const readYamlAndInterpret = async (
    yamlContent: string,
    options: ReadYamlOptions = {}
): Promise<void> => {
    const { browsers = {}, logger = dumbLogger, onPage, onBrowser, headless = true, launchOptions = {} } = options;

    const rootYaml = parseYaml(yamlContent);

    const domainResolver = new Resolver((envVarName: string) => {
        const envVarValue = process.env[envVarName];
        if (envVarValue) return envVarValue;

        throw new Error(`environment variable "${envVarName}" is not set (or empty)`);
    }, logger);

    const root = domainResolver.resolve(rootYaml);

    const scenariosByBrowser = new Map<SupportedBrowser, Scenario[]>();
    for (const scenario of root.scenarios) {
        const list = scenariosByBrowser.get(scenario.browser) ?? [];
        list.push(scenario);
        scenariosByBrowser.set(scenario.browser, list);
    }

    /** Runs the scenarios of one browser in parallel; resolves to their errors, in scenario order. */
    const runOnBrowser = async (browserName: SupportedBrowser, scenarios: Scenario[]): Promise<unknown[]> => {
        let browser = browsers[browserName];
        const shouldClose = !browser;

        if (!browser) {
            try {
                logger.info(`Launching ${browserName} (headless: ${headless})`);
                browser = await launchBrowser(browserName, headless, launchOptions[browserName]);
            } catch (e) {
                const error = new BrowserLaunchError(browserName, e);
                logger.error(error.message);
                return [error];
            }
        }
        const runningBrowser = browser;

        try {
            if (onBrowser) {
                try {
                    await onBrowser(runningBrowser, browserName);
                } catch (e) {
                    const error = new BrowserLaunchError(browserName, e);
                    logger.error(error.message);
                    return [error];
                }
            }
            const errorsPerScenario = await Promise.all(
                scenarios.map(async scenario => {
                    try {
                        await evalScenario(runningBrowser, scenario, logger, onPage);
                        return [];
                    } catch (e) {
                        return e instanceof AggregateError ? e.errors : [e];
                    }
                })
            );
            return errorsPerScenario.flat();
        } finally {
            if (shouldClose) {
                await runningBrowser.close().catch(e => logger.warn(`Failed to close ${browserName}: ${e}`));
            }
        }
    };

    const errorsPerBrowser = await Promise.all(
        [...scenariosByBrowser].map(([name, scenarios]) => runOnBrowser(name, scenarios))
    );
    const errors = errorsPerBrowser.flat();

    if (errors.length > 0) {
        throw new AggregateError(errors, `${errors.length} error(s) occurred while running scenarios`);
    }
};
