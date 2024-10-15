import * as fs from 'fs';
import * as p from 'puppeteer';
import { SupportedBrowser } from './core/model';
import { parseYaml } from './yaml/parser';
import { Resolver } from './yaml/resolver';
import { evalScenario } from './puppet/interpreter';
import { dumbLogger } from './core/logger';

(async () => {
    const args = process.argv.slice(2);
    const yamlFile = args[0];

    if (!yamlFile) {
        console.error('Veuillez spécifier le nom du fichier YAML.');
        process.exit(1);
    }

    const yamlContent = fs.readFileSync(`./src/scenarios/${yamlFile}`, 'utf8');
    const yamlRoot = parseYaml(yamlContent);

    const resolver = new Resolver((envVarName: string) => {
        const envVarValue = process.env[envVarName];
        if (envVarValue !== undefined) {
            return envVarValue;
        } else {
            throw new Error(`La variable d'environnement ${envVarName} n'est pas définie`);
        }
    }, dumbLogger);

    const root = resolver.resolve(yamlRoot);

    for (const scenario of root.scenarios) {
        const browserName = scenario.browser;

        const supportedBrowsers: SupportedBrowser[] = ['chrome', 'firefox'];

        if (!supportedBrowsers.includes(browserName)) {
            console.error(`Navigateur non supporté: ${browserName}. Les navigateurs supportés sont: ${supportedBrowsers.join(', ')}`);
            process.exit(1);
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

        const browser = await p.launch({
            headless: false,
            browser: browserName,
            acceptInsecureCerts: true,
            args: browserArgs,
        });

        await evalScenario(browser, scenario, dumbLogger);

        await browser.close();
    }
})();
