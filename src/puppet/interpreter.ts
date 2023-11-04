import * as p from "puppeteer";
import { Action, ActionType, Scenario } from "../core/model";

export const evalScenario = async (browser: p.Browser, scenario: Scenario): Promise<void[]> => {

    return await evalSafely(scenario.workers, scenario.name, async index => {
        for (let i = 0; i < scenario.iterations; i++) {

            const run = scenario.run;
            if ("delaySecondsBetweenWorkerInits" in run) {
                await new Promise(r => setTimeout(r, run.delaySecondsBetweenWorkerInits * index * 1000));
            } else {
                await new Promise(r => setTimeout(r, run.initialDelaySeconds * 1000));
            }

            const page = await browser.newPage();
            await evalScenarioOnce(scenario.name + ` (${index})`, scenario.actions, page, index);
            await page.close();
        }
    });

};

const evalSafely = async <T>(nb: number, scenarioName: string, createElement: (indexd: number) => Promise<T>): Promise<void[]> =>
    Promise.all(
        Array.from(
            { length: nb },
            async (_, elementIndex) => {
                try {
                    await createElement(elementIndex);
                } catch (e) {
                    console.error(`Scenario ${scenarioName} (worker ${elementIndex}) failed: ${e}`)
                }
            }
        )
    );

const evalScenarioOnce = async (scenarioName: string, actions: Action[], page: p.Page, workerIndex: number) => {

    for (const action of actions) {
        const { actionType } = action;
        switch (action.actionType) {
            case ActionType.Navigate:
                if ("url" in action.location)
                    await page.goto(action.location.url);
                else
                    await page.goto(action.location.workerIndex[workerIndex])
                break;
            case ActionType.WaitForever:
                while (true) {
                    await new Promise(r => setTimeout(r, 3600 * 1000));
                }
                break;
            default:
                throw new Error(`Unhandled action type "${actionType}" while evaluating scenario "${scenarioName}" on worker ${workerIndex}`)
        }
    }
}
