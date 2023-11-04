export enum ActionType {
    Navigate = 0,
    WaitForever = 1
};

export type NavigateAction = {
    actionType: ActionType.Navigate,
    location: UrlOrArray
}

export type WaitForeverAction = {
    actionType: ActionType.WaitForever
}

export type Action = NavigateAction | WaitForeverAction;

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