const describe = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

/**
 * Raised when a worker of a scenario fails. Carries the scenario name and the
 * worker index so the caller knows exactly where the failure happened.
 */
export class WorkerError extends Error {
    readonly scenarioName: string;
    readonly workerIndex: number;

    constructor(scenarioName: string, workerIndex: number, cause: unknown) {
        super(`Scenario "${scenarioName}" (worker ${workerIndex}) failed: ${describe(cause)}`, { cause });
        this.name = 'WorkerError';
        this.scenarioName = scenarioName;
        this.workerIndex = workerIndex;
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
