type SelectorYaml = { cssSelector: string } | { xpathSelector: string };
type ActionStepSetYaml = ActionYaml[];

type GotoActionYaml = {
  kind: "goto";
  url: string;
};

type ClickActionYaml = {
  kind: "click";
  options?: {
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
  }
} & SelectorYaml;

type TypeActionYaml = {
  kind: "type";
  text: string;
} & SelectorYaml;

type WaitActionYaml = {
  kind: "wait";
  timeout?: number;
} & SelectorYaml;

type ScrollActionYaml = {
  kind: "scroll";
  direction: "UP" | "DOWN";
  pixels: number;
};

type EvaluateActionYaml = {
  kind: "evaluate";
  script: string;
} & SelectorYaml;

type RefreshActionYaml = {
  kind: "refresh";
};

type LogActionYaml = {
  kind: "log";
  message: string;
}

type SetIntervalActionYaml = {
  kind: "setInterval";
  callback: string;
  interval: number;
};

type NestedActionSteps = {
  kind: "name";
  steps: ActionStepSetYaml;
};

export type ActionYaml =
  | GotoActionYaml
  | ClickActionYaml
  | TypeActionYaml
  | WaitActionYaml
  | ScrollActionYaml
  | SetIntervalActionYaml 
  | RefreshActionYaml
  | LogActionYaml
  | NestedActionSteps
  | EvaluateActionYaml;
  