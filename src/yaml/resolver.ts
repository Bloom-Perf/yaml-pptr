import { YpLogger, dumbLogger } from '../core/logger';
import {
    Action,
    ActionType,
    Scenario,
    UrlOrArray,
    NavigateAction,
    WaitAction,
    WaitForeverAction,
    GotoAction,
    ClickAction,
    TypeAction,
    WaitForSelectorAction,
    WaitForTimeoutAction,
    PauseAction,
    ScreenshotAction,
    EvaluateAction,
    SetViewportAction,
    CloseAction,
    Run,
    SupportedBrowser,
} from '../core/model';
import { RootYaml, ScenarioYaml, ActionYaml, StepYaml } from './validator';

type EnvVarResolve = (arg: string) => string;

export class Resolver {
    private envVarResolve: EnvVarResolve;
    private logger: YpLogger;

    constructor(envVarResolve: EnvVarResolve, logger: YpLogger = dumbLogger) {
        this.envVarResolve = (envVarWithDollar: string) => {
            const envVarName = envVarWithDollar.startsWith('$') ? envVarWithDollar.substring(1) : envVarWithDollar;
            return envVarResolve(envVarName);
        };
        this.logger = logger;
    }

    public resolve(yaml: RootYaml): { scenarios: Scenario[] } {
        return {
            scenarios: yaml.scenarios.map((s, i) => this.resolveScenario(s, i + 1)),
        };
    }

    private resolveScenario(scenarioYaml: ScenarioYaml, index: number): Scenario {
        this.logger.debug(`Resolving YAML scenario: ${JSON.stringify(scenarioYaml)}`);

        const actions: Action[] = [];

        if (scenarioYaml.location) {
            actions.push(this.createNavigateAction(scenarioYaml.location));
        }

        if (scenarioYaml.steps) {
            actions.push(...scenarioYaml.steps.map(step => this.resolveStep(step)));
        }

        if (scenarioYaml.actions) {
            actions.push(...scenarioYaml.actions.map(action => this.resolveAction(action)));
        }

        const run: Run = scenarioYaml.run === 'SEQUENTIAL'
            ? { delaySecondsBetweenWorkerInits: scenarioYaml.initialDelaySeconds || 0 }
            : { initialDelaySeconds: scenarioYaml.initialDelaySeconds || 0 };

        return {
            name: scenarioYaml.name || `Scenario ${index}`,
            browser: scenarioYaml.browser || 'chrome', // Ajout du champ 'browser'
            run,
            workers: scenarioYaml.workers || 1,
            iterations: scenarioYaml.iterations || 1,
            actions,
        };
    }

    private resolveStep(stepYaml: StepYaml): Action {
        if (stepYaml === 'waitForever') {
            this.logger.debug(`Resolving step: waitForever`);
            return { actionType: ActionType.WaitForever } as WaitForeverAction;
        }

        if ('wait' in stepYaml) {
            this.logger.debug(`Resolving step: wait ${stepYaml.wait} seconds`);
            return {
                actionType: ActionType.Wait,
                milliseconds: stepYaml.wait * 1000,
            } as WaitAction;
        }

        if ('navigate' in stepYaml) {
            this.logger.debug(`Resolving step: navigate`);
            return this.createNavigateAction(stepYaml.navigate);
        }

        throw new Error(`Unknown step format: ${JSON.stringify(stepYaml)}`);
    }

    private resolveAction(actionYaml: ActionYaml): Action {
        this.logger.debug(`Resolving action: ${JSON.stringify(actionYaml)}`);

        switch (actionYaml.type) {
            case 'GOTO':
                return {
                    actionType: ActionType.Goto,
                    url: this.resolveStringOrEnv(actionYaml.url),
                    options: actionYaml.options,
                } as GotoAction;
            case 'WAIT':
                return {
                    actionType: ActionType.Wait,
                    milliseconds: actionYaml.milliseconds * 1000,
                } as WaitAction;
            case 'CLICK':
                return {
                    actionType: ActionType.Click,
                    selector: actionYaml.selector,
                    options: actionYaml.options,
                } as ClickAction;
            case 'TYPE':
                return {
                    actionType: ActionType.Type,
                    selector: actionYaml.selector,
                    text: actionYaml.text,
                    options: actionYaml.options,
                } as TypeAction;
            case 'WAIT_FOR_SELECTOR':
                return {
                    actionType: ActionType.WaitForSelector,
                    selector: actionYaml.selector,
                    options: actionYaml.options,
                } as WaitForSelectorAction;
            case 'WAIT_FOR_TIMEOUT':
                return {
                    actionType: ActionType.WaitForTimeout,
                    timeout: actionYaml.timeout,
                } as WaitForTimeoutAction;
            case 'PAUSE':
                return {
                    actionType: ActionType.Pause,
                } as PauseAction;
            case 'SCREENSHOT':
                return {
                    actionType: ActionType.Screenshot,
                    path: this.resolveStringOrEnv(actionYaml.path),
                    options: actionYaml.options,
                } as ScreenshotAction;
            case 'EVALUATE':
                return {
                    actionType: ActionType.Evaluate,
                    script: actionYaml.script,
                } as EvaluateAction;
            case 'SET_VIEWPORT':
                return {
                    actionType: ActionType.SetViewport,
                    width: actionYaml.width,
                    height: actionYaml.height,
                } as SetViewportAction;
            case 'CLOSE':
                return {
                    actionType: ActionType.Close,
                } as CloseAction;
            default:
                const _exhaustiveCheck: never = actionYaml;
                return _exhaustiveCheck;
        }
    }

    private createNavigateAction(location: string): NavigateAction {
        return {
            actionType: ActionType.Navigate,
            location: this.resolveUrlOrEnv(location),
        };
    }

    private resolveUrlOrEnv(urlOrEnv: string): UrlOrArray {
        const suffix = '[workerIndex]';

        if (urlOrEnv.startsWith('$')) {
            if (urlOrEnv.startsWith('$INDEXED') && urlOrEnv.endsWith(suffix)) {
                this.logger.debug(`Resolving indexed environment variable: "${urlOrEnv}"`);
                const envVarName = urlOrEnv.substring(1, urlOrEnv.length - suffix.length);
                const envVarValue = this.envVarResolve(envVarName);
                const urls = envVarValue.split(',').map(t => t.trim());
                return { workerIndex: urls };
            }
            this.logger.debug(`Resolving environment variable: "${urlOrEnv}"`);
            return { url: this.envVarResolve(urlOrEnv.substring(1)) };
        }

        this.logger.debug(`Using direct URL: "${urlOrEnv}"`);
        return { url: urlOrEnv };
    }

    private resolveStringOrEnv(value: string): string {
        if (value.startsWith('$')) {
            this.logger.debug(`Resolving environment variable: "${value}"`);
            return this.envVarResolve(value.substring(1));
        }
        return value;
    }
}
