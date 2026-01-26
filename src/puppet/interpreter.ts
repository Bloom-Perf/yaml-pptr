import * as p from 'puppeteer';
import { YpLogger, dumbLogger } from '../core/logger';
import {
    Action,
    ActionType,
    ClickAction,
    EvaluateAction,
    GotoAction,
    NavigateAction,
    Scenario,
    ScreenshotAction,
    SetViewportAction,
    TypeAction,
    WaitAction,
    WaitForSelectorAction,
    WaitForTimeoutAction
} from '../core/model';

type LoadEvent = 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
type MouseButton = 'left' | 'right' | 'middle';

function ensureCorrectExtension(path: string, type?: 'png' | 'jpeg' | 'webp'): `${string}.png` | `${string}.jpeg` | `${string}.webp` {
    const detectedType = type || 'png';

    // Si le chemin a déjà une extension valide, on le retourne tel quel
    if (path.endsWith('.png') || path.endsWith('.jpeg') || path.endsWith('.jpg') || path.endsWith('.webp')) {
        return path as `${string}.png` | `${string}.jpeg` | `${string}.webp`;
    }

    // Sinon, on ajoute l'extension appropriée basée sur le type spécifié
    return `${path}.${detectedType}` as `${string}.png` | `${string}.jpeg` | `${string}.webp`;
}

export const evalScenario = async (browser: p.Browser, scenario: Scenario, logger: YpLogger = dumbLogger): Promise<void[]> => {
    return await evalSafely(scenario.workers, scenario.name, async workerIndex => {
        for (let i = 0; i < scenario.iterations; i++) {

            const run = scenario.run;
            if ('delaySecondsBetweenWorkerInits' in run) {
                logger.info(`Scenario "${scenario.name}" (worker ${workerIndex}) > Choosing SEQUENTIAL start with ${run.delaySecondsBetweenWorkerInits} seconds between workers`);
                await new Promise(r => setTimeout(r, run.delaySecondsBetweenWorkerInits * workerIndex * 1000));
            } else {
                logger.info(`Scenario "${scenario.name}" (worker ${workerIndex}) > Choosing PARALLEL start with ${run.initialDelaySeconds} seconds of initial delay`);
                await new Promise(r => setTimeout(r, run.initialDelaySeconds * 1000));
            }

            const page = await browser.newPage();
            await evalScenarioOnce(scenario.name, scenario.actions, page, workerIndex, logger);
            await page.close();
        }
    }, logger);
};

const evalSafely = async <T>(nb: number, scenarioName: string, createElement: (index: number) => Promise<T>, logger: YpLogger = dumbLogger): Promise<void[]> =>
    Promise.all(
        Array.from(
            { length: nb },
            async (_, elementIndex) => {
                try {
                    logger.info(`Scenario "${scenarioName}" (worker ${elementIndex}) started.`);
                    await createElement(elementIndex);
                } catch (e) {
                    logger.error(`Scenario ${scenarioName} (worker ${elementIndex}) failed: ${e}`);
                }
            }
        )
    );

const evalScenarioOnce = async (scenarioName: string, actions: Action[], page: p.Page, workerIndex: number, logger: YpLogger = dumbLogger) => {

    for (const action of actions) {
        const { actionType } = action;
        switch (actionType) {
            case ActionType.Navigate:
                const navigateAction = action as NavigateAction;
                if ('url' in navigateAction.location) {
                    logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > Navigating to location "${navigateAction.location.url}"`);
                    await page.goto(navigateAction.location.url);
                } else {
                    logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > Navigating to indexed location "${navigateAction.location.workerIndex[workerIndex]}"`);
                    await page.goto(navigateAction.location.workerIndex[workerIndex]);
                }
                break;
            case ActionType.Wait:
                const waitAction = action as WaitAction;
                logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > Waiting ${waitAction.milliseconds} milliseconds...`);
                await page.evaluate((ms) => new Promise(resolve => setTimeout(resolve, ms)), waitAction.milliseconds);
                break;
            case ActionType.WaitForever:
                logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > Waiting forever...`);
                while (true) {
                    await new Promise(r => setTimeout(r, 3600 * 1000));
                }
                break;
            case ActionType.Goto:
                const gotoAction = action as GotoAction;
                logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > GOTO "${gotoAction.url}"`);
                const gotoOptions = {
                    timeout: gotoAction.options?.timeout,
                    waitUntil: gotoAction.options?.waitUntil,
                    referer: gotoAction.options?.referer,
                };
                await page.goto(gotoAction.url, gotoOptions);
                break;
            case ActionType.Click:
                const clickAction = action as ClickAction;
                logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > CLICK on "${clickAction.selector}"`);
                const clickOptions = {
                    button: clickAction.options?.button,
                    clickCount: clickAction.options?.clickCount,
                    delay: clickAction.options?.delay,
                };
                await page.click(clickAction.selector, clickOptions);
                break;
            case ActionType.Type:
                const typeAction = action as TypeAction;
                logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > TYPE into "${typeAction.selector}"`);
                await page.type(typeAction.selector, typeAction.text, typeAction.options);
                break;
            case ActionType.WaitForSelector:
                const waitForSelectorAction = action as WaitForSelectorAction;
                logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > WAIT_FOR_SELECTOR "${waitForSelectorAction.selector}"`);
                await page.waitForSelector(waitForSelectorAction.selector, waitForSelectorAction.options);
                break;
            case ActionType.WaitForTimeout:
                const waitForTimeoutAction = action as WaitForTimeoutAction;
                logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > WAIT_FOR_TIMEOUT ${waitForTimeoutAction.timeout} milliseconds`);
                await page.evaluate((ms) => new Promise(resolve => setTimeout(resolve, ms)), waitForTimeoutAction.timeout);
                break;
            case ActionType.Pause:
                logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > PAUSE, press Enter to continue...`);
                await new Promise<void>(resolve => {
                    process.stdin.resume();
                    process.stdin.once('data', () => {
                        process.stdin.pause();
                        resolve();
                    });
                });
                break;
            case ActionType.Screenshot:
                const screenshotAction = action as ScreenshotAction;
                logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > SCREENSHOT "${screenshotAction.path}"`);
                const screenshotOptions = {
                    path: ensureCorrectExtension(screenshotAction.path, screenshotAction.options?.type),
                    //path: screenshotAction.path,
                    type: screenshotAction.options?.type,
                    quality: screenshotAction.options?.quality,
                    fullPage: screenshotAction.options?.fullPage,
                    clip: screenshotAction.options?.clip,
                    omitBackground: screenshotAction.options?.omitBackground,
                    encoding: screenshotAction.options?.encoding,
                };
                await page.screenshot(screenshotOptions);
                break;
            case ActionType.Evaluate:
                const evaluateAction = action as EvaluateAction;
                logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > EVALUATE script`);
                await page.evaluate(evaluateAction.script);
                break;
            case ActionType.SetViewport:
                const setViewportAction = action as SetViewportAction;
                logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > SET_VIEWPORT width=${setViewportAction.width}, height=${setViewportAction.height}`);
                await page.setViewport({ width: setViewportAction.width, height: setViewportAction.height });
                break;
            case ActionType.Close:
                logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > CLOSE page`);
                await page.close();
                break;
            default:
                throw new Error(`Unhandled action type "${actionType}" while evaluating scenario "${scenarioName}" on worker ${workerIndex}`);
        }
    }
};
