import * as p from 'puppeteer';
import { setTimeout as sleep } from 'node:timers/promises';
import { YpLogger, dumbLogger } from '../core/logger.js';
import { WorkerError } from '../core/errors.js';
import {
    Action,
    ActionType,
    ClickAction,
    EvaluateAction,
    GotoAction,
    NavigateAction,
    OnPageCallback,
    Run,
    Scenario,
    ScreenshotAction,
    SetViewportAction,
    TypeAction,
    WaitAction,
    WaitForSelectorAction,
    WaitForTimeoutAction
} from '../core/model.js';

function ensureCorrectExtension(path: string, type?: 'png' | 'jpeg' | 'webp'): `${string}.png` | `${string}.jpeg` | `${string}.webp` {
    const detectedType = type || 'png';

    // Si le chemin a déjà une extension valide, on le retourne tel quel
    if (path.endsWith('.png') || path.endsWith('.jpeg') || path.endsWith('.jpg') || path.endsWith('.webp')) {
        return path as `${string}.png` | `${string}.jpeg` | `${string}.webp`;
    }

    // Sinon, on ajoute l'extension appropriée basée sur le type spécifié
    return `${path}.${detectedType}` as `${string}.png` | `${string}.jpeg` | `${string}.webp`;
}

/**
 * Start delay of a worker, applied once before its first iteration:
 * - PARALLEL: every worker waits `initialDelaySeconds`;
 * - SEQUENTIAL: worker `n` waits `n × delaySecondsBetweenWorkerInits`.
 */
const startDelaySeconds = (run: Run, workerIndex: number): number =>
    'delaySecondsBetweenWorkerInits' in run
        ? run.delaySecondsBetweenWorkerInits * workerIndex
        : run.initialDelaySeconds;

/**
 * Runs every worker of the scenario, each one running all its iterations.
 * A failing iteration interrupts neither the next iterations of the worker
 * nor the other workers. Once everything is done, the promise rejects with an
 * `AggregateError` of `WorkerError` (one per failed iteration) if anything failed.
 */
export const evalScenario = async (browser: p.Browser, scenario: Scenario, logger: YpLogger = dumbLogger, onPage?: OnPageCallback): Promise<void> => {
    const errors: WorkerError[] = [];

    const runWorker = async (workerIndex: number): Promise<void> => {
        const delay = startDelaySeconds(scenario.run, workerIndex);
        const strategy = 'delaySecondsBetweenWorkerInits' in scenario.run ? 'SEQUENTIAL' : 'PARALLEL';
        logger.info(`Scenario "${scenario.name}" (worker ${workerIndex}) started (${strategy}, starting in ${delay}s).`);
        await sleep(delay * 1000);

        for (let iteration = 0; iteration < scenario.iterations; iteration++) {
            try {
                await runIteration(browser, scenario, workerIndex, iteration, logger, onPage);
            } catch (e) {
                const error = new WorkerError(scenario.name, workerIndex, iteration, e);
                logger.error(error.message);
                errors.push(error);
            }
        }
    };

    await Promise.all(Array.from({ length: scenario.workers }, (_, workerIndex) => runWorker(workerIndex)));

    if (errors.length > 0) {
        errors.sort((a, b) => a.workerIndex - b.workerIndex || a.iteration - b.iteration);
        const total = scenario.workers * scenario.iterations;
        throw new AggregateError(errors, `Scenario "${scenario.name}": ${errors.length}/${total} iteration(s) failed`);
    }
};

/**
 * Runs one iteration in a fresh page. The page is always closed afterwards,
 * whether the iteration succeeded or not (unless a CLOSE action already did it).
 */
const runIteration = async (browser: p.Browser, scenario: Scenario, workerIndex: number, iteration: number, logger: YpLogger, onPage?: OnPageCallback): Promise<void> => {
    let page: p.Page | undefined;
    try {
        page = await browser.newPage();

        if (onPage) {
            await onPage(page, {
                scenarioName: scenario.name,
                workerIndex,
                iteration,
            });
        }

        await evalScenarioOnce(scenario.name, scenario.actions, page, workerIndex, logger);
    } finally {
        if (page && !page.isClosed()) {
            await page.close().catch(e =>
                logger.warn(`Scenario "${scenario.name}" (worker ${workerIndex}, iteration ${iteration}) > failed to close page: ${e}`)
            );
        }
    }
};

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
                await sleep(waitAction.milliseconds);
                break;
            case ActionType.WaitForever:
                logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > Waiting forever...`);
                while (true) {
                    await sleep(3600 * 1000);
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
                await sleep(waitForTimeoutAction.timeout);
                break;
            case ActionType.Pause:
                if (!process.stdin.isTTY) {
                    // Nobody can press Enter (CI, container, piped input): waiting would block forever
                    logger.warn(`Scenario "${scenarioName}" (worker ${workerIndex}) > PAUSE ignored: no interactive terminal`);
                    break;
                }
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
