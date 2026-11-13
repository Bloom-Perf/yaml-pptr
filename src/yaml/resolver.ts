import { YpLogger, dumbLogger } from '../core/logger.js';
import { ConfigurationError } from '../core/errors.js';
import {
    Action,
    ActionType,
    Scenario,
    NavigateAction,
    Run,
} from '../core/model.js';
import { RootYaml, ScenarioYaml, ActionYaml, StepYaml } from './validator.js';

type EnvVarResolve = (name: string) => string;

/** What the resolution of a scenario needs to know about it. */
type ResolveContext = {
    name: string;
    workers: number;
};

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
/** `$VAR`: the whole value is an environment variable (legacy syntax). */
const WHOLE_VALUE_VAR = /^\$([A-Za-z_][A-Za-z0-9_]*)$/;
/** `$VAR[workerIndex]`: comma-separated values, one per worker (location / navigate only). */
const PER_WORKER_VAR = /^\$([A-Za-z_][A-Za-z0-9_]*)\[workerIndex\]$/;
/** `${VAR}` placeholders, `$${` being an escaped literal `${`. */
const PLACEHOLDER = /\$\$\{|\$\{([^}]*)\}/g;

const PER_WORKER_HINT = 'per-worker values ("$VAR[workerIndex]") are only supported as the whole value of location and navigate';

/**
 * Transforms the validated YAML into the domain model and resolves
 * environment variables:
 * - `${VAR}` anywhere in URLs, selectors, typed texts and screenshot paths;
 * - `$VAR` as the whole value of location, navigate, GOTO url and SCREENSHOT path;
 * - `$VAR[workerIndex]` as the whole value of location and navigate.
 *
 * Resolved values are never logged: they may contain credentials.
 */
export class Resolver {
    private readonly envVarResolve: EnvVarResolve;
    private readonly logger: YpLogger;

    constructor(envVarResolve: EnvVarResolve, logger: YpLogger = dumbLogger) {
        this.envVarResolve = envVarResolve;
        this.logger = logger;
    }

    public resolve(yaml: RootYaml): { scenarios: Scenario[] } {
        return {
            scenarios: yaml.scenarios.map((s, i) => this.resolveScenario(s, i + 1)),
        };
    }

    private resolveScenario(scenarioYaml: ScenarioYaml, index: number): Scenario {
        const ctx: ResolveContext = {
            name: scenarioYaml.name || `Scenario ${index}`,
            workers: scenarioYaml.workers || 1,
        };
        this.logger.debug(
            `Resolving scenario "${ctx.name}" (${scenarioYaml.steps?.length ?? 0} step(s), ${scenarioYaml.actions?.length ?? 0} action(s))`
        );

        const actions: Action[] = [];
        try {
            if (scenarioYaml.location) {
                actions.push(this.createNavigateAction(scenarioYaml.location, ctx));
            }
            for (const step of scenarioYaml.steps ?? []) {
                actions.push(this.resolveStep(step, ctx));
            }
            for (const action of scenarioYaml.actions ?? []) {
                actions.push(this.resolveAction(action));
            }
        } catch (e) {
            throw new ConfigurationError(`Scenario "${ctx.name}": ${e instanceof Error ? e.message : String(e)}`, { cause: e });
        }

        const run: Run = scenarioYaml.run === 'SEQUENTIAL'
            ? { delaySecondsBetweenWorkerInits: scenarioYaml.initialDelaySeconds || 0 }
            : { initialDelaySeconds: scenarioYaml.initialDelaySeconds || 0 };

        return {
            name: ctx.name,
            browser: scenarioYaml.browser || 'chrome',
            run,
            workers: ctx.workers,
            iterations: scenarioYaml.iterations || 1,
            actions,
        };
    }

    private resolveStep(stepYaml: StepYaml, ctx: ResolveContext): Action {
        if (stepYaml === 'waitForever') {
            return { actionType: ActionType.WaitForever };
        }

        // Full action written among the steps
        if ('type' in stepYaml) {
            return this.resolveAction(stepYaml);
        }

        if ('wait' in stepYaml) {
            return { actionType: ActionType.Wait, milliseconds: stepYaml.wait * 1000 };
        }

        if ('navigate' in stepYaml) {
            return this.createNavigateAction(stepYaml.navigate, ctx);
        }

        if ('click' in stepYaml) {
            return { actionType: ActionType.Click, selector: this.interpolate(stepYaml.click) };
        }

        return {
            actionType: ActionType.Type,
            selector: this.interpolate(stepYaml.input.selector),
            text: this.interpolate(stepYaml.input.text),
        };
    }

    private resolveAction(actionYaml: ActionYaml): Action {
        this.logger.debug(`Resolving action: ${actionYaml.type}`);

        switch (actionYaml.type) {
            case 'GOTO':
                return {
                    actionType: ActionType.Goto,
                    url: this.resolveWholeValueOrInterpolate(actionYaml.url),
                    options: actionYaml.options && {
                        ...actionYaml.options,
                        referer: actionYaml.options.referer && this.interpolate(actionYaml.options.referer),
                    },
                };
            case 'WAIT':
                return { actionType: ActionType.Wait, milliseconds: actionYaml.milliseconds };
            case 'CLICK':
                return {
                    actionType: ActionType.Click,
                    selector: this.interpolate(actionYaml.selector),
                    options: actionYaml.options,
                };
            case 'TYPE':
                return {
                    actionType: ActionType.Type,
                    selector: this.interpolate(actionYaml.selector),
                    text: this.interpolate(actionYaml.text),
                    options: actionYaml.options,
                };
            case 'WAIT_FOR_SELECTOR':
                return {
                    actionType: ActionType.WaitForSelector,
                    selector: this.interpolate(actionYaml.selector),
                    options: actionYaml.options,
                };
            case 'WAIT_FOR_TIMEOUT':
                return { actionType: ActionType.WaitForTimeout, timeout: actionYaml.timeout };
            case 'PAUSE':
                return { actionType: ActionType.Pause };
            case 'SCREENSHOT':
                return {
                    actionType: ActionType.Screenshot,
                    path: this.resolveWholeValueOrInterpolate(actionYaml.path),
                    options: actionYaml.options,
                };
            case 'EVALUATE':
                // Never interpolated: injecting values into code would be unsafe
                return { actionType: ActionType.Evaluate, script: actionYaml.script };
            case 'SET_VIEWPORT':
                return { actionType: ActionType.SetViewport, width: actionYaml.width, height: actionYaml.height };
            case 'CLOSE':
                return { actionType: ActionType.Close };
            default: {
                const _exhaustiveCheck: never = actionYaml;
                return _exhaustiveCheck;
            }
        }
    }

    private createNavigateAction(location: string, ctx: ResolveContext): NavigateAction {
        const perWorker = PER_WORKER_VAR.exec(location);
        if (perWorker) {
            const name = perWorker[1];
            const values = this.env(name).split(',').map(v => v.trim());
            if (values.some(v => v === '')) {
                throw new Error(`environment variable "${name}" (used as "${location}") contains an empty value`);
            }
            if (values.length < ctx.workers) {
                throw new Error(
                    `environment variable "${name}" (used as "${location}") provides ${values.length} value(s) for ${ctx.workers} worker(s)`
                );
            }
            return { actionType: ActionType.Navigate, location: { workerIndex: values } };
        }

        return { actionType: ActionType.Navigate, location: { url: this.resolveWholeValueOrInterpolate(location) } };
    }

    /** `$VAR` as the whole value, or `${VAR}` placeholders anywhere. */
    private resolveWholeValueOrInterpolate(value: string): string {
        const wholeValue = WHOLE_VALUE_VAR.exec(value);
        if (wholeValue) {
            return this.env(wholeValue[1]);
        }
        if (/^\$[A-Za-z_]/.test(value)) {
            throw new Error(
                `unsupported environment variable reference "${value}": use "$VAR" for the whole value or "\${VAR}" inside a value` +
                (value.endsWith('[workerIndex]') ? `; ${PER_WORKER_HINT}` : '')
            );
        }
        return this.interpolate(value);
    }

    /** Replaces `${VAR}` placeholders; `$${` produces a literal `${`. */
    private interpolate(value: string): string {
        return value.replace(PLACEHOLDER, (match: string, name: string | undefined) => {
            if (match === '$${') {
                return '${';
            }
            if (name === undefined || !ENV_NAME.test(name)) {
                throw new Error(
                    `invalid placeholder "${match}": expected \${VAR_NAME}` +
                    (name?.endsWith('[workerIndex]') ? `; ${PER_WORKER_HINT}` : '')
                );
            }
            return this.env(name);
        });
    }

    private env(name: string): string {
        this.logger.debug(`Resolving environment variable "${name}"`);
        return this.envVarResolve(name);
    }
}
