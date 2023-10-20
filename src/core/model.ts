export enum ActionType {
    Navigate = 0,
};

export type NavigateAction = {
    actionType: ActionType.Navigate,
    url: string
}

export type Action = NavigateAction;

export enum ScenarioMode {
    OneShot,
    Repeat
}

export type Scenario = {
    name: string,
    mode: ScenarioMode,
    actions: Action[]
}

export type Root = {
    scenarios: Scenario[]
};