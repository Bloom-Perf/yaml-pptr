export enum ActionType {
    Navigate = 'Navigate',
    WaitForever = 'WaitForever',
    Wait = 'Wait',
    Goto = 'GOTO',
    Click = 'CLICK',
    Type = 'TYPE',
    WaitForSelector = 'WAIT_FOR_SELECTOR',
    WaitForTimeout = 'WAIT_FOR_TIMEOUT',
    Pause = 'PAUSE',
    Screenshot = 'SCREENSHOT',
    Close = 'CLOSE',
    Evaluate = 'EVALUATE',
    SetViewport = 'SET_VIEWPORT',
}

export type UrlOrArray = { url: string } | { workerIndex: string[] };

export interface BaseAction {
    actionType: ActionType;
}

export interface NavigateAction extends BaseAction {
    actionType: ActionType.Navigate;
    location: UrlOrArray;
}

export interface WaitForeverAction extends BaseAction {
    actionType: ActionType.WaitForever;
}

export interface WaitAction extends BaseAction {
    actionType: ActionType.Wait;
    milliseconds: number;
}

export type WaitUntil = 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
export type MouseButton = 'left' | 'right' | 'middle';

export interface GotoOptions {
    timeout?: number;
    waitUntil?: WaitUntil | WaitUntil[];
    referer?: string;
}

export interface ClickOptions {
    button?: MouseButton;
    clickCount?: number;
    delay?: number;
}

export interface TypeOptions {
    delay?: number;
}

export interface WaitForSelectorOptions {
    visible?: boolean;
    hidden?: boolean;
    timeout?: number;
}

export interface ScreenshotOptions {
    type?: 'png' | 'jpeg';
    quality?: number;
    fullPage?: boolean;
    clip?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    omitBackground?: boolean;
    encoding?: 'base64' | 'binary';
}

export interface GotoAction extends BaseAction {
    actionType: ActionType.Goto;
    url: string;
    options?: GotoOptions;
}

export interface ClickAction extends BaseAction {
    actionType: ActionType.Click;
    selector: string;
    options?: ClickOptions;
}

export interface TypeAction extends BaseAction {
    actionType: ActionType.Type;
    selector: string;
    text: string;
    options?: TypeOptions;
}

export interface WaitForSelectorAction extends BaseAction {
    actionType: ActionType.WaitForSelector;
    selector: string;
    options?: WaitForSelectorOptions;
}

export interface WaitForTimeoutAction extends BaseAction {
    actionType: ActionType.WaitForTimeout;
    timeout: number;
}

export interface PauseAction extends BaseAction {
    actionType: ActionType.Pause;
}

export interface ScreenshotAction extends BaseAction {
    actionType: ActionType.Screenshot;
    path: string;
    options?: ScreenshotOptions;
}

export interface CloseAction extends BaseAction {
    actionType: ActionType.Close;
}

export interface EvaluateAction extends BaseAction {
    actionType: ActionType.Evaluate;
    script: string | ((...args: any[]) => any);
}

export interface SetViewportAction extends BaseAction {
    actionType: ActionType.SetViewport;
    width: number;
    height: number;
}

export type Action =
    | NavigateAction
    | WaitForeverAction
    | WaitAction
    | GotoAction
    | ClickAction
    | TypeAction
    | WaitForSelectorAction
    | WaitForTimeoutAction
    | PauseAction
    | ScreenshotAction
    | CloseAction
    | EvaluateAction
    | SetViewportAction;

export type Run =
    | {
          initialDelaySeconds: number;
      }
    | {
          delaySecondsBetweenWorkerInits: number;
      };

export type SupportedBrowser = 'chrome' | 'firefox';

export type Scenario = {
    name: string;
    browser: SupportedBrowser;
    run: Run;
    workers: number;
    iterations: number;
    actions: Action[];
};

export type Root = {
    scenarios: Scenario[];
};
