import * as z from 'zod';

// All objects are strict: an unknown key (typically a typo such as
// `iteration:` or `selecter:`) is reported instead of being silently ignored.
//
// Descriptions are exported to the JSON Schema (see json-schema.ts) and shown
// by editors on hover.

const nonNegativeInt = z.number().int().nonnegative();
const positiveInt = z.number().int().positive();

const selector = z.string().describe(
    'CSS selector, or Puppeteer selector: ::-p-xpath(...), ::-p-text(...), ::-p-aria(...), xpath/..., >>> (shadow DOM). ${VAR} placeholders are resolved.'
);
const url = z.string().describe('URL. "$VAR" as the whole value, or ${VAR} placeholders anywhere.');

const waitUntilEnum = z.enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2']);
const mouseButtonEnum = z.enum(['left', 'right', 'middle']);

const supportedBrowsersEnum = z.enum(['chrome', 'firefox']);

const gotoOptionsSchema = z.strictObject({
    timeout: nonNegativeInt.optional().describe('Navigation timeout in milliseconds.'),
    waitUntil: z.union([waitUntilEnum, waitUntilEnum.array()]).optional().describe('When to consider the navigation finished.'),
    referer: z.string().optional().describe('Referer header. ${VAR} placeholders are resolved.'),
}).optional();

const clickOptionsSchema = z.strictObject({
    button: mouseButtonEnum.optional(),
    clickCount: positiveInt.optional().describe('2 for a double-click.'),
    delay: nonNegativeInt.optional().describe('Milliseconds between mousedown and mouseup.'),
}).optional();

const typeOptionsSchema = z.strictObject({
    delay: nonNegativeInt.optional().describe('Milliseconds between keystrokes.'),
}).optional();

const waitForSelectorOptionsSchema = z.strictObject({
    visible: z.boolean().optional(),
    hidden: z.boolean().optional(),
    timeout: nonNegativeInt.optional().describe('Timeout in milliseconds.'),
}).optional();

const screenshotOptionsSchema = z.strictObject({
    type: z.enum(['png', 'jpeg']).optional(),
    quality: z.number().int().min(0).max(100).optional().describe('JPEG quality (0-100).'),
    fullPage: z.boolean().optional(),
    clip: z.strictObject({
        x: z.number(),
        y: z.number(),
        width: z.number().positive(),
        height: z.number().positive(),
    }).optional(),
    omitBackground: z.boolean().optional(),
    encoding: z.enum(['base64', 'binary']).optional(),
}).optional();

// Action schemas (full syntax)
const gotoActionSchema = z.strictObject({
    type: z.literal('GOTO'),
    url,
    options: gotoOptionsSchema,
}).describe('Navigate to a URL, with navigation options.');

const clickActionSchema = z.strictObject({
    type: z.literal('CLICK'),
    selector,
    options: clickOptionsSchema,
}).describe('Click on an element.');

const typeActionSchema = z.strictObject({
    type: z.literal('TYPE'),
    selector,
    text: z.string().describe('Text to type. ${VAR} placeholders are resolved (keep credentials in environment variables). Never logged.'),
    options: typeOptionsSchema,
}).describe('Type text into an element.');

const waitForSelectorActionSchema = z.strictObject({
    type: z.literal('WAIT_FOR_SELECTOR'),
    selector,
    options: waitForSelectorOptionsSchema,
}).describe('Wait for an element to appear (or to be visible / hidden).');

const waitForTimeoutActionSchema = z.strictObject({
    type: z.literal('WAIT_FOR_TIMEOUT'),
    timeout: nonNegativeInt.describe('Milliseconds.'),
}).describe('Wait for a duration in milliseconds.');

const waitActionSchema = z.strictObject({
    type: z.literal('WAIT'),
    milliseconds: nonNegativeInt,
}).describe('Wait for a duration in milliseconds.');

const pauseActionSchema = z.strictObject({
    type: z.literal('PAUSE'),
}).describe('Wait for Enter in an interactive terminal (debugging). Ignored with a warning when there is none.');

const screenshotActionSchema = z.strictObject({
    type: z.literal('SCREENSHOT'),
    path: z.string().describe('File path. "$VAR" as the whole value, or ${VAR} placeholders anywhere.'),
    options: screenshotOptionsSchema,
}).describe('Take a screenshot.');

const evaluateActionSchema = z.strictObject({
    type: z.literal('EVALUATE'),
    script: z.string().describe('JavaScript evaluated in the page. Never interpolated.'),
}).describe('Evaluate JavaScript in the page.');

const setViewportActionSchema = z.strictObject({
    type: z.literal('SET_VIEWPORT'),
    width: positiveInt,
    height: positiveInt,
}).describe('Set the page viewport size.');

const closeActionSchema = z.strictObject({
    type: z.literal('CLOSE'),
}).describe('Close the page.');

const actionSchema = z.discriminatedUnion('type', [
    gotoActionSchema,
    clickActionSchema,
    typeActionSchema,
    waitForSelectorActionSchema,
    waitForTimeoutActionSchema,
    waitActionSchema,
    pauseActionSchema,
    screenshotActionSchema,
    evaluateActionSchema,
    setViewportActionSchema,
    closeActionSchema,
]);

export type ActionYaml = z.infer<typeof actionSchema>;

// Step schemas (shorthand syntax)
const navigateStepSchema = z.strictObject({
    navigate: url,
}).describe('Navigate to a URL ("$VAR[workerIndex]" gives one URL per worker).');

const waitForeverStepSchema = z.literal('waitForever').describe('Keep the page open forever.');

const waitSecondsStepSchema = z.strictObject({
    wait: z.number().nonnegative().describe('Seconds.'),
}).describe('Wait for a duration in seconds.');

const clickStepSchema = z.strictObject({
    click: selector,
}).describe('Click on an element.');

const inputStepSchema = z.strictObject({
    input: z.strictObject({
        selector,
        text: z.string().describe('Text to type. ${VAR} placeholders are resolved (keep credentials in environment variables). Never logged.'),
    }),
}).describe('Type text into an element.');

// A step is either a shorthand step or a full action, so both syntaxes can be
// mixed in the order they must run.
const stepSchema = z.union([
    navigateStepSchema,
    waitForeverStepSchema,
    waitSecondsStepSchema,
    clickStepSchema,
    inputStepSchema,
    actionSchema,
]);

export type StepYaml = z.infer<typeof stepSchema>;

const scenarioSchema = z.strictObject({
    name: z.string().optional().describe('Scenario name (default: "Scenario <n>").'),
    browser: supportedBrowsersEnum.optional().describe('Browser to use (default: chrome).'),
    run: z.enum(['PARALLEL', 'SEQUENTIAL']).optional().describe(
        'Worker start strategy (default: PARALLEL). PARALLEL: all workers start after initialDelaySeconds. SEQUENTIAL: worker n starts after n × initialDelaySeconds.'
    ),
    initialDelaySeconds: z.number().nonnegative().optional().describe('Start delay, applied once per worker before its first iteration (see run).'),
    workers: positiveInt.optional().describe('Number of parallel workers (default: 1).'),
    iterations: positiveInt.optional().describe('Repetitions per worker (default: 1).'),
    location: url.optional().describe('Starting URL. "$VAR", ${VAR} placeholders, or "$VAR[workerIndex]" for one URL per worker.'),
    steps: z.array(stepSchema).optional().describe('Shorthand steps; full actions are accepted too, to mix both syntaxes in order.'),
    actions: z.array(actionSchema).optional().describe('Full actions, run after steps.'),
}).describe('A population of users: its workers run the steps and actions for the given number of iterations.');

export type ScenarioYaml = z.infer<typeof scenarioSchema>;

export const rootZod = z.strictObject({
    scenarios: z.array(scenarioSchema).describe('Scenarios, all started at the same time.'),
});

export type RootYaml = z.infer<typeof rootZod>;
