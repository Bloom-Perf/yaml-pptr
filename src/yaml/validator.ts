
import * as z from "zod";

const urlOrEnv = z.string().url().or(z.string().startsWith("$"))

const navigateStepZod = z.object({
    navigate: urlOrEnv
});

const stepZod = navigateStepZod;

const scenarioZod = z.object({
    name: z.string(),
    location: urlOrEnv.optional(),
    steps: stepZod.array().optional()
});

export const rootZod = z.object({
    scenarios: scenarioZod.array()
})

export type RootYaml = z.infer<typeof rootZod>;