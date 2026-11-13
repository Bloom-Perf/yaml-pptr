import * as z from 'zod';

// All objects are strict: an unknown key (typically a typo such as
// `iteration:` or `selecter:`) is reported instead of being silently ignored.

const nonNegativeInt = z.number().int().nonnegative();
const positiveInt = z.number().int().positive();

const waitUntilEnum = z.enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2']);
const mouseButtonEnum = z.enum(['left', 'right', 'middle']);

const supportedBrowsersEnum = z.enum(['chrome', 'firefox']);

const gotoOptionsSchema = z.strictObject({
    timeout: nonNegativeInt.optional(),
    waitUntil: z.union([waitUntilEnum, waitUntilEnum.array()]).optional(),
    referer: z.string().optional(),
}).optional();

const clickOptionsSchema = z.strictObject({
    button: mouseButtonEnum.optional(),
    clickCount: positiveInt.optional(),
    delay: nonNegativeInt.optional(),
}).optional();

const typeOptionsSchema = z.strictObject({
    delay: nonNegativeInt.optional(),
}).optional();

const waitForSelectorOptionsSchema = z.strictObject({
    visible: z.boolean().optional(),
    hidden: z.boolean().optional(),
    timeout: nonNegativeInt.optional(),
}).optional();

const screenshotOptionsSchema = z.strictObject({
    type: z.enum(['png', 'jpeg']).optional(),
    quality: z.number().int().min(0).max(100).optional(),
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
    url: z.string(),
    options: gotoOptionsSchema,
});

const clickActionSchema = z.strictObject({
    type: z.literal('CLICK'),
    selector: z.string(),
    options: clickOptionsSchema,
});

const typeActionSchema = z.strictObject({
    type: z.literal('TYPE'),
    selector: z.string(),
    text: z.string(),
    options: typeOptionsSchema,
});

const waitForSelectorActionSchema = z.strictObject({
    type: z.literal('WAIT_FOR_SELECTOR'),
    selector: z.string(),
    options: waitForSelectorOptionsSchema,
});

const waitForTimeoutActionSchema = z.strictObject({
    type: z.literal('WAIT_FOR_TIMEOUT'),
    timeout: nonNegativeInt,
});

const waitActionSchema = z.strictObject({
    type: z.literal('WAIT'),
    milliseconds: nonNegativeInt,
});

const pauseActionSchema = z.strictObject({
    type: z.literal('PAUSE'),
});

const screenshotActionSchema = z.strictObject({
    type: z.literal('SCREENSHOT'),
    path: z.string(),
    options: screenshotOptionsSchema,
});

const evaluateActionSchema = z.strictObject({
    type: z.literal('EVALUATE'),
    script: z.string(),
});

const setViewportActionSchema = z.strictObject({
    type: z.literal('SET_VIEWPORT'),
    width: positiveInt,
    height: positiveInt,
});

const closeActionSchema = z.strictObject({
    type: z.literal('CLOSE'),
});

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
    navigate: z.string(),
});

const waitForeverStepSchema = z.literal('waitForever');

const waitSecondsStepSchema = z.strictObject({
    wait: z.number().nonnegative(),
});

const clickStepSchema = z.strictObject({
    click: z.string(),
});

const inputStepSchema = z.strictObject({
    input: z.strictObject({
        selector: z.string(),
        text: z.string(),
    }),
});

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
    name: z.string().optional(),
    browser: supportedBrowsersEnum.optional(),
    run: z.enum(['PARALLEL', 'SEQUENTIAL']).optional(),
    initialDelaySeconds: z.number().nonnegative().optional(),
    workers: positiveInt.optional(),
    iterations: positiveInt.optional(),
    location: z.string().optional(),
    steps: z.array(stepSchema).optional(),
    actions: z.array(actionSchema).optional(),
});

export type ScenarioYaml = z.infer<typeof scenarioSchema>;

export const rootZod = z.strictObject({
    scenarios: z.array(scenarioSchema),
});

export type RootYaml = z.infer<typeof rootZod>;
