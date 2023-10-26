import * as p from "puppeteer";
import { Action, ActionType, Scenario } from "../core/model";

export const evalScenario = async (page: p.Page, scenario: Scenario): Promise<void[]> => {

    if ("oneshot" in scenario.mode) {
        return await evalSafely(scenario.mode.oneshot, scenario.name, async index => {
            await evalScenarioOnce(scenario.name + ` (${index})`, scenario.actions, page);
        });
    }

    return await evalSafely(scenario.mode.repeat, scenario.name, async index => {
        while (true)
            await evalScenarioOnce(scenario.name + ` (${index})`, scenario.actions, page);
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
                    console.error(`Scenario ${scenarioName} (${elementIndex}) failed: ${e}`)
                }
            }
        )
    );

const evalScenarioOnce = async (scenarioName: string, actions: Action[], page: p.Page) => {

    for(const action of actions) {
        switch (action.actionType) {
            case ActionType.Navigate:
                await page.goto(action.url);
                break;
            default:
                throw new Error(`Unhandled action type "${action.actionType}" while evaluating scenario "${scenarioName}"`)
        }
    }
}
