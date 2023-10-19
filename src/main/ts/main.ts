import * as fs from 'fs';
import * as yaml from 'js-yaml';
import chalk from "chalk";
import { ActionYaml } from './type';
import { MetricsEmitter, Status } from "./metrics";
import { Conf } from "./conf";
const window = require('window');
import puppeteer, { Page, Browser } from 'puppeteer';
import { promiseAll, customSetInterval } from "./utils";

type BrowserInstance = {
  browser: Browser;
  index: number;
};

export const launchActionYaml = (conf: Conf, me: MetricsEmitter): Promise<BrowserInstance[]> => {

  async function readAndParseActions(yamlFilePath: string): Promise<ActionYaml[]> {
    const yamlData = fs.readFileSync(yamlFilePath, 'utf8');
    const actions: ActionYaml[] = yaml.load(yamlData) as ActionYaml[];
    return actions;
  }

  async function performScrollAction(page: Page, action: {direction: any; pixels: any; }) {
    const { direction, pixels } = action;
    if (direction === "UP") {
      await page.evaluate((pixels: number) => {
        if (typeof window !== "undefined") {
          window.scrollBy(0, -pixels);
        } else {
          console.log("Le code utilisant window n'est pas exécuté car window n'est pas défini. Vous n'êtes probablement pas dans un navigateur.");
        }
      }, pixels);
    } else if (direction === "DOWN") {
      await page.evaluate((pixels: any) => {
        if (typeof window !== "undefined") {
          window.scrollBy(0, pixels);
        } else {
          console.log("Le code utilisant window n'est pas exécuté car window n'est pas défini. Vous n'êtes probablement pas dans un navigateur.");
        }
      }, pixels);
    }
  }

  async function clickWithXPath(page: Page, xpath: string) {
    const elements = await page.$x(xpath);
    if (elements.length > 0) {
      await elements[0].evaluate(a => a.click());
    } else {
      throw new Error(`Aucun élément ne correspond à l'expression XPath : ${xpath}`);
    }
  }

  async function interpretActions(browser: Browser, actions: ActionYaml[]) {
    const page = await browser.newPage();
    try {
      for(const action of actions){
        switch(action.kind) {
          case 'name':
            for(const step of action.steps){
              switch(step.kind){
                case 'goto':
                  await page.goto(step.url);
                  break;
                case 'click':
                  if ("cssSelector" in step){
                    await page.click(step.cssSelector, step.options)
                  } else {
                    await clickWithXPath(page, step.xpathSelector)
                  }
                  break;
                case 'type':
                  if ("cssSelector" in step){
                    await page.type(step.cssSelector, step.text)
                  } else {
                    await page.type(step.xpathSelector, step.text)
                  }
                  break;
                case 'evaluate':
                  if ("cssSelector" in step){
                    await page.evaluate(step.cssSelector, step.script)
                  } else {
                    await page.evaluate(step.xpathSelector, step.script)
                  }
                  break;
                case 'wait':
                  if ("cssSelector" in step){
                    await page.waitForSelector(step.cssSelector, { timeout: step.timeout })
                  } else {
                    await page.waitForXPath(step.xpathSelector, { timeout: step.timeout })
                  }
                  break;
                case 'scroll':
                  await performScrollAction(page, step)
                  break;
                case 'refresh':
                  await page.reload()
                  break;
                case 'log':
                  console.log(step.message)
                  break;
                case 'setInterval':
                  customSetInterval(() => {
                    console.log(step.callback);
                  }, step.interval)
                  break;
                default:
                  console.error(`Action non reconnue : ${action}`);
                  break;
              }
            }
        }
      }
    } catch(err){
      me.browserScenarioUseCase(Status.Error);
      console.log(`Error on ${page}: ${chalk.redBright(String(err))}`);
    }
  }

  async function main(browser: Browser) {
    const yamlFilePath = '../yaml/carto.yml';
    me.browserTabStarted(Status.Success);
    
    const actions: ActionYaml[] = await readAndParseActions(yamlFilePath);

    // Appel de la fonction interpretActions avec les actions analysées
    await interpretActions(browser, actions);
  }

  return promiseAll(conf.nbBrowsers, async browserIndex => {

    console.log(`Start browser ${chalk.greenBright(String(browserIndex))}`);

    // Spawn a new browser instance
    const browser = await puppeteer.launch({
        headless: conf.headless,
        ignoreHTTPSErrors: true,
        product: "firefox",
        args: [
            "--start-maximized", 
            '--private',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    });

    me.browserStarted("firefox", Status.Success);

    // On application exit, close all browsers
    process.on('exit', () => {
        console.log(`Closing browser ${chalk.greenBright(String(browserIndex))}`);
        return browser.close();
    });

    // Start all tabs and wait for completion
    return await promiseAll(conf.nbTabs, async tabIndex => {
      const tabIdUser = `${chalk.greenBright(String(browserIndex))}/${chalk.yellowBright(String(tabIndex))}`

      console.log(`Start browser page ${tabIdUser}`);
      await main(browser);

      return Promise.resolve();

    }).then(_ => ({ browser, index: browserIndex } as BrowserInstance));

  });
}