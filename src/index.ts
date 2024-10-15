// src/index.ts
import * as p from 'puppeteer';
import { SupportedBrowser } from './core/model';
import { parseYaml } from './yaml/parser';
import { Resolver } from './yaml/resolver';
import { evalScenario } from './puppet/interpreter';
import { YpLogger, dumbLogger } from './core/logger';



export const readYamlAndInterpret = async (
    yamlContent: string,
    browsers: { [key in SupportedBrowser]?: p.Browser } = {},
    logger: YpLogger = dumbLogger
): Promise<void> => {
    // Analyse et résolution du YAML
    const rootYaml = parseYaml(yamlContent);

    const domainResolver = new Resolver((envVarName: string) => {
        const envVarValue = process.env[envVarName];

        logger.debug(`Resolving env variable "${envVarName}" with value ***`);
        if (envVarValue) return envVarValue;

        throw new Error(`Tried to resolve env variable ${envVarName} but was empty.`);
    }, logger);

    const root = domainResolver.resolve(rootYaml);

    // Grouper les scénarios par navigateur
    const scenariosByBrowser: { [key in SupportedBrowser]?: typeof root.scenarios } = {};
    for (const scenario of root.scenarios) {
        const browserName = scenario.browser || 'chrome'; // Défaut à chrome
        if (!scenariosByBrowser[browserName]) {
            scenariosByBrowser[browserName] = [];
        }
        scenariosByBrowser[browserName]?.push(scenario);
    }

    const supportedBrowsers: SupportedBrowser[] = ['chrome', 'firefox'];

    // Lancer les navigateurs et exécuter les scénarios
    const browserPromises = Object.entries(scenariosByBrowser).map(async ([browserName, scenarios]) => {
        if (!scenarios) return;

        if (!supportedBrowsers.includes(browserName as SupportedBrowser)) {
            console.error(`Navigateur non supporté: ${browserName}. Les navigateurs supportés sont: ${supportedBrowsers.join(', ')}`);
            return;
        }

        const browserArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--ignore-certificate-errors',
        ];

        if (browserName === 'chrome') {
            browserArgs.push('--start-maximized');
        }

        if (browserName === 'firefox') {
            browserArgs.push('--private');
        }

        let browser = browsers[browserName as SupportedBrowser];
        let shouldClose = false;

        // Si aucun navigateur n'est fourni pour ce type, en lancer un nouveau
        if (!browser) {
            browser = await p.launch({
                headless: false,
                channel: browserName as any, // 'chrome' ou 'firefox'
                acceptInsecureCerts: true,
                args: browserArgs,
            });
            shouldClose = true; // Indiquer que ce navigateur doit être fermé après utilisation
        }

        try {
            for (const scenario of scenarios) {
                await evalScenario(browser, scenario, logger);
            }
        } catch (error) {
            console.error(`Erreur lors de l'exécution des scénarios pour ${browserName}:`, error);
        } finally {
            if (shouldClose && browser) {
                await browser.close();
            }
        }
    });

    await Promise.all(browserPromises);
};
