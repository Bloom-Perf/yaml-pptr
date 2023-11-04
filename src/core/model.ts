export enum ActionType {
    Navigate = 0,
};

export type NavigateAction = {
    actionType: ActionType.Navigate,
    location: UrlOrArray
}

export type Action = NavigateAction;

export type Run = {
    initialDelaySeconds: number
} | {
    delaySecondsBetweenWorkerInits: number
};

export type UrlOrArray = { url: string } | { workerIndex: string[] };

export type Scenario = {
    name: string,
    run: Run,
    workers: number,
    iterations: number,
    actions: Action[]
}

export type Root = {
    scenarios: Scenario[]
};