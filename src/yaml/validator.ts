import * as z from 'zod';

const waitUntilEnum = z.enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2']);
const mouseButtonEnum = z.enum(['left', 'right', 'middle']);

const supportedBrowsersEnum = z.enum(['chrome', 'firefox']);

const gotoOptionsSchema = z.object({
    timeout: z.number().optional(),
    waitUntil: z.union([waitUntilEnum, waitUntilEnum.array()]).optional(),
    referer: z.string().optional(),
}).optional();

const waitActionSchema = z.object({
    type: z.literal('WAIT'),
    milliseconds: z.number(),
});

const clickOptionsSchema = z.object({
    button: mouseButtonEnum.optional(),
    clickCount: z.number().optional(),
    delay: z.number().optional(),
}).optional();

const typeOptionsSchema = z.object({
    delay: z.number().optional(),
}).optional();

const waitForSelectorOptionsSchema = z.object({
    visible: z.boolean().optional(),
    hidden: z.boolean().optional(),
    timeout: z.number().optional(),
}).optional();

const screenshotOptionsSchema = z.object({
    type: z.enum(['png', 'jpeg']).optional(),
    quality: z.number().optional(),
    fullPage: z.boolean().optional(),
    clip: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
    }).optional(),
    omitBackground: z.boolean().optional(),
    encoding: z.enum(['base64', 'binary']).optional(),
}).optional();

// Schémas des actions
const gotoActionSchema = z.object({
    type: z.literal('GOTO'),
    url: z.string(),
    options: gotoOptionsSchema,
});

const clickActionSchema = z.object({
    type: z.literal('CLICK'),
    selector: z.string(),
    options: clickOptionsSchema,
});

const typeActionSchema = z.object({
    type: z.literal('TYPE'),
    selector: z.string(),
    text: z.string(),
    options: typeOptionsSchema,
});

const waitForSelectorActionSchema = z.object({
    type: z.literal('WAIT_FOR_SELECTOR'),
    selector: z.string(),
    options: waitForSelectorOptionsSchema,
});

const waitForTimeoutActionSchema = z.object({
    type: z.literal('WAIT_FOR_TIMEOUT'),
    timeout: z.number(),
});

const pauseActionSchema = z.object({
    type: z.literal('PAUSE'),
});

const screenshotActionSchema = z.object({
    type: z.literal('SCREENSHOT'),
    path: z.string(),
    options: screenshotOptionsSchema,
});

const evaluateActionSchema = z.object({
    type: z.literal('EVALUATE'),
    script: z.union([z.string(), z.function()]),
});

const setViewportActionSchema = z.object({
    type: z.literal('SET_VIEWPORT'),
    width: z.number(),
    height: z.number(),
});

const closeActionSchema = z.object({
    type: z.literal('CLOSE'),
});

// Création d'un tableau mutable de schémas d'actions
const actionSchemas = [
    gotoActionSchema,
    clickActionSchema,
    typeActionSchema,
    waitForSelectorActionSchema,
    waitForTimeoutActionSchema,
    pauseActionSchema,
    screenshotActionSchema,
    evaluateActionSchema,
    setViewportActionSchema,
    closeActionSchema,
    waitActionSchema,
];

if (actionSchemas.length === 0) {
    throw new Error('Le tableau des schémas d\'actions est vide.');
}

type ActionSchemaType = typeof actionSchemas[number];
const actionSchemasTuple = actionSchemas as [ActionSchemaType, ...ActionSchemaType[]];

const actionSchema = z.discriminatedUnion('type', actionSchemasTuple);

export type ActionYaml = z.infer<typeof actionSchema>;

const navigateStepSchema = z.object({
    navigate: z.string(),
});

const waitForeverStepSchema = z.literal('waitForever');

const waitSecondsStepSchema = z.object({
    wait: z.number(),
});

const clickStepSchema = z.object({
    click: z.string(),
});

const inputStepSchema = z.object({
    input: z.object({
        selector: z.string(),
        text: z.string(),
    }),
});

const stepSchema = z.union([
    navigateStepSchema,
    waitForeverStepSchema,
    waitSecondsStepSchema,
    clickStepSchema,
    inputStepSchema,
]);

export type StepYaml = z.infer<typeof stepSchema>;

// Schéma du scénario
const scenarioSchema = z.object({
    name: z.string().optional(),
    browser: supportedBrowsersEnum.optional(),
    run: z.enum(['PARALLEL', 'SEQUENTIAL']).optional(),
    initialDelaySeconds: z.number().nonnegative().optional(),
    workers: z.number().positive().optional(),
    iterations: z.number().positive().optional(),
    location: z.string().optional(),
    steps: z.array(stepSchema).optional(),
    actions: z.array(actionSchema).optional(),
});

export type ScenarioYaml = z.infer<typeof scenarioSchema>;

export const rootZod = z.object({
    scenarios: z.array(scenarioSchema),
});

export type RootYaml = z.infer<typeof rootZod>;
