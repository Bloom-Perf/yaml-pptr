export enum ActionType {
    Navigate = 0,
};

export type NavigateAction = {
    actionType: ActionType.Navigate,
    url: string
}

export type Action = NavigateAction;

export type ScenarioMode = {
    oneshot: number} | {
    repeat: number
}

export type Scenario = {
    name: string,
    mode: ScenarioMode,
    actions: Action[]
}

export type Root = {
    scenarios: Scenario[]
};