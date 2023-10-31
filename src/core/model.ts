export enum ActionType {
    Navigate = 0,
};

export type NavigateAction = {
    actionType: ActionType.Navigate,
    url: string
}

export type Action = NavigateAction;

export type Scenario = {
    name: string,
    workers: number,
    iterations: number,
    actions: Action[]
}

export type Root = {
    scenarios: Scenario[]
};