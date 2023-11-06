// Yaml model to Core model

import { Action, ActionType, Run, Scenario, UrlOrArray } from "../core/model";
import { RootYaml } from "./validator";

type ScenarioYaml = RootYaml["scenarios"][0];

type EnvVarResolve = (arg: string) => string;

type StepYaml = NonNullable<ScenarioYaml["steps"]>[0];

export class Resolver {

    constructor(private envVarResolve: EnvVarResolve) {
        this.envVarResolve = (envVarWithDollar: string) => envVarResolve(envVarWithDollar.substring(1));
    }


    private step(step: StepYaml): Action {
        if (step === "waitForever") {
            return {
                actionType: ActionType.WaitForever
            };
        }
        return {
            actionType: ActionType.Navigate,
            location: this.resolveUrlOrEnv(step.navigate)
        }
    }

    private scenario(scenario: ScenarioYaml, n: number): Scenario {
        return {
            name: scenario.name || `Scenario ${n}`,
            run: scenario.run == "SEQUENTIAL" ? {
                delaySecondsBetweenWorkerInits: scenario.initialDelaySeconds || 0
            } : {
                initialDelaySeconds: scenario.initialDelaySeconds || 0
            },
            workers: scenario.workers || 1,
            iterations: scenario.iterations || Number.POSITIVE_INFINITY,
            actions: [
                {
                    actionType: ActionType.Navigate,
                    location: this.resolveUrlOrEnv(scenario.location)
                }, ...(scenario.steps || []).map(s => this.step(s))]
        }
    }

    private resolveUrlOrEnv(urlOrEnv: string): UrlOrArray {

        const suffix = "[workerIndex]";

        if (urlOrEnv.startsWith("$")) {
            if (urlOrEnv.endsWith(suffix)) {
                const envVarWithoutSuffix = urlOrEnv.substring(0, urlOrEnv.length - suffix.length);
                const allUrls = this.envVarResolve(envVarWithoutSuffix).split(",").map(t => t.trim())
                return {
                    workerIndex: allUrls
                }
            }
            return { url: this.envVarResolve(urlOrEnv) };
        }
        return { url: urlOrEnv };
    }

    public resolve(yaml: RootYaml) {
        return {
            scenarios: yaml.scenarios.map((s, i) => this.scenario(s, i + 1))
        }
    };

}