const describe = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

/**
 * Raised before anything runs when the configuration is invalid: YAML syntax,
 * schema validation (unknown key, wrong type...) or environment variable
 * resolution (missing variable, not enough per-worker values...).
 */
export class ConfigurationError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'ConfigurationError';
    }
}

/**
 * Raised when an iteration of a scenario worker fails. Carries the scenario
 * name, the worker index and the iteration so the caller knows exactly where
 * the failure happened.
 */
export class WorkerError extends Error {
    readonly scenarioName: string;
    readonly workerIndex: number;
    readonly iteration: number;

    constructor(scenarioName: string, workerIndex: number, iteration: number, cause: unknown) {
        super(`Scenario "${scenarioName}" (worker ${workerIndex}, iteration ${iteration}) failed: ${describe(cause)}`, { cause });
        this.name = 'WorkerError';
        this.scenarioName = scenarioName;
        this.workerIndex = workerIndex;
        this.iteration = iteration;
    }
}

/**
 * Raised when a browser could not be launched (missing binary, bad options...), or when
 * the `onBrowser` callback failed on it.
 */
export class BrowserLaunchError extends Error {
    readonly browser: string;

    constructor(browser: string, cause: unknown) {
        super(`Failed to launch browser "${browser}": ${describe(cause)}`, { cause });
        this.name = 'BrowserLaunchError';
        this.browser = browser;
    }
}
