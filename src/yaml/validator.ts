
import * as z from "zod";

const navigateStepZod = z.object({
    action: z.literal("NAVIGATE"),
    url: z.string().url()
})

const stepZod = z.discriminatedUnion("action", [
    navigateStepZod
]);

const scenarioZod = z.object({
    name: z.string(),
    steps: stepZod.array()
});

export const rootZod = z.object({
    scenarios: scenarioZod.array()
})

export type RootYaml = z.infer<typeof rootZod>;