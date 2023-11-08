import * as p from "puppeteer";
import { Action, ActionType, Scenario } from "../core/model";
import { YpLogger, dumbLogger } from "../core/logger";

export const evalScenario = async (browser: p.Browser, scenario: Scenario, logger: YpLogger = dumbLogger): Promise<void[]> => {

    return await evalSafely(scenario.workers, scenario.name, async workerIndex => {
        for (let i = 0; i < scenario.iterations; i++) {

            const run = scenario.run;
            if ("delaySecondsBetweenWorkerInits" in run) {
                logger.info(`Scenario "${scenario.name}" (worker ${workerIndex}) > Choosing SEQUENTIAL start with ${run.delaySecondsBetweenWorkerInits} seconds between workers`);
                await new Promise(r => setTimeout(r, run.delaySecondsBetweenWorkerInits * workerIndex * 1000));
            } else {
                logger.info(`Scenario "${scenario.name}" (worker ${workerIndex}) > Choosing PARALLEL start with ${run.initialDelaySeconds} seconds of initial delay`);
                await new Promise(r => setTimeout(r, run.initialDelaySeconds * 1000));
            }

            const page = await browser.newPage();
            await evalScenarioOnce(scenario.name, scenario.actions, page, workerIndex);
            await page.close();
        }
    });

};

const evalSafely = async <T>(nb: number, scenarioName: string, createElement: (indexd: number) => Promise<T>, logger: YpLogger = dumbLogger): Promise<void[]> =>
    Promise.all(
        Array.from(
            { length: nb },
            async (_, elementIndex) => {
                try {
                    logger.info(`Scenario "${scenarioName}" (worker ${elementIndex}) started.`)
                    await createElement(elementIndex);
                } catch (e) {
                    logger.error(`Scenario ${scenarioName} (worker ${elementIndex}) failed: ${e}`)
                }
            }
        )
    );

const evalScenarioOnce = async (scenarioName: string, actions: Action[], page: p.Page, workerIndex: number, logger: YpLogger = dumbLogger) => {

    for (const action of actions) {
        const { actionType } = action;
        switch (action.actionType) {
            case ActionType.Navigate:
                if ("url" in action.location) {
                    logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > Navigating to location "${action.location.url}"`)
                    await page.goto(action.location.url);
                } else {
                    logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > Navigating to indexed location "${action.location.workerIndex[workerIndex]}"`)
                    await page.goto(action.location.workerIndex[workerIndex])
                }
                break;
            case ActionType.WaitForever:
                logger.info(`Scenario "${scenarioName}" (worker ${workerIndex}) > Waiting forever...`)
                while (true) {
                    await new Promise(r => setTimeout(r, 3600 * 1000));
                }
                break;
            default:
                throw new Error(`Unhandled action type "${actionType}" while evaluating scenario "${scenarioName}" on worker ${workerIndex}`)
        }
    }
}
