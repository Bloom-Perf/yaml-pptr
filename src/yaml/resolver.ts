// Yaml model to Core model

import { Action, ActionType, Root, Scenario, ScenarioMode } from "../core/model";
import { RootYaml } from "./validator";

export const toDomain = (yaml: RootYaml): Root => ({
    scenarios: yaml.scenarios.map(scenarioToDomain)
});

type ScenarioYaml =  RootYaml["scenarios"][0];

const scenarioToDomain = (scenario: ScenarioYaml): Scenario => ({
    name: scenario.name,
    mode: ScenarioMode.OneShot,
    actions: scenario.steps.map(stepToDomain)
});

type StepYaml = ScenarioYaml["steps"][0];

const stepToDomain = (step: StepYaml): Action => ({
    ...step, actionType: ActionType.Navigate
})