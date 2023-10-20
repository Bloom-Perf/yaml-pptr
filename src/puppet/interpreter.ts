import * as p from "puppeteer";
import { ActionType, Scenario } from "../core/model";

export const evalScenario = async (page: p.Page, scenario: Scenario): Promise<void> => {
    for(const action of scenario.actions) {
        switch (action.actionType) {
            case ActionType.Navigate:
                await page.goto(action.url);
                break;
            default:
                throw new Error(`Unhandled action type "${action.actionType}" while evaluating scenario "${scenario.name}"`)
        }
    }
};
