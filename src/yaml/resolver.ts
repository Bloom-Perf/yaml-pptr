// Yaml model to Core model

import { ActionType, Scenario, ScenarioMode } from "../core/model";
import { RootYaml } from "./validator";

type ScenarioYaml =  RootYaml["scenarios"][0];

type EnvVarResolve = (string) => string;

type StepYaml = NonNullable<ScenarioYaml["steps"]>[0];

export class Resolver {
    constructor(private envVarResolve: EnvVarResolve) {
        this.envVarResolve = (envVarWithDollar: string) => envVarResolve(envVarWithDollar.substring(1));
    }


    private step(step: StepYaml) {
        return {
            actionType: ActionType.Navigate,
            url: this.resolveUrlOrEnv(step.navigate)
        }
    }

    private scenario(scenario: ScenarioYaml): Scenario {
        return {
            name: scenario.name,
            mode: ScenarioMode.OneShot,
            actions: [
                // location field in api generates the first navigate action
                ...("location" in scenario 
                    ? [{
                        actionType: ActionType.Navigate,
                        url: this.resolveUrlOrEnv(scenario.location!)
                    }]
                    : []),
                ...(scenario.steps || []).map(s => this.step(s))
            ]
        }   
    }

    private resolveUrlOrEnv(urlOrEnv: string) {
        return urlOrEnv.startsWith("$")
            ? this.envVarResolve(urlOrEnv)
            : urlOrEnv;
    }

    public resolve(yaml: RootYaml) {
        return {
            scenarios: yaml.scenarios.map(s => this.scenario(s))
        }
    };

}