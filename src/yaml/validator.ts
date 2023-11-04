
import * as z from "zod";

const urlOrEnv = z.string().url()
    .or(z.string().startsWith("$"))

const navigateStepZod = z.object({
    navigate: urlOrEnv
});

const stepZod = navigateStepZod;

const scenarioZod = z.object({
    name: z.string().optional(),
    run: z.enum(["PARALLEL", "SEQUENTIAL"]).optional(),
    initialDelaySeconds: z.number().min(0, "A delay must be positive").optional(),
    workers: z.number().min(0, "Number of workers must be positive").optional(),
    iterations: z.number().min(0, "Number of iterations must be positive").optional(),
    location: urlOrEnv,
    steps: stepZod.array().optional()
});

export const rootZod = z.object({
    scenarios: scenarioZod.array()
})

export type RootYaml = z.infer<typeof rootZod>;