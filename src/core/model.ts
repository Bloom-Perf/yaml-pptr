export enum ActionType {
    Navigate = 0,
};

export type NavigateAction = {
    actionType: ActionType.Navigate,
    location: UrlOrArray
}

export type Action = NavigateAction;

export type UrlOrArray = { url: string } | { workerIndex: string[] };

export type Scenario = {
    name: string,
    workers: number,
    iterations: number,
    actions: Action[]
}

export type Root = {
    scenarios: Scenario[]
};