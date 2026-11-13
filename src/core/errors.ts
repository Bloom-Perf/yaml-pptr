const describe = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

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
 * Raised when a browser could not be launched (missing binary, bad options...).
 */
export class BrowserLaunchError extends Error {
    readonly browser: string;

    constructor(browser: string, cause: unknown) {
        super(`Failed to launch browser "${browser}": ${describe(cause)}`, { cause });
        this.name = 'BrowserLaunchError';
        this.browser = browser;
    }
}
