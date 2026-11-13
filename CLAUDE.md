# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                # Run all tests with mocha (TypeScript loaded through tsx)
npm run test:coverage   # Run tests with coverage via c8
npm run typecheck       # Type-check src, test and examples (no emit)
npm run build           # Build with esbuild + tsc, then generate dist/schema.json (outputs to dist/)
```

To run a single test file:
```bash
npx mocha test/yaml/parser.spec.ts
```

Relative imports use explicit `.js` extensions (`moduleResolution: nodenext`), e.g. `import { parseYaml } from './yaml/parser.js'`.

## Architecture

yaml-pptr is a library that transforms YAML configurations into Puppeteer browser automation actions.

**Pipeline flow:**
```
YAML string → parseYaml() → Resolver.resolve() → evalScenario() → Puppeteer actions
```

**Key modules:**

- `src/index.ts` - Main entry point exposing `readYamlAndInterpret()`. Groups scenarios by browser type, manages browser lifecycle, and starts all scenarios in parallel.

- `src/yaml/parser.ts` - Parses YAML string using js-yaml and validates with zod schema. Any problem is thrown as a `ConfigurationError` (with `z.prettifyError` output).

- `src/yaml/validator.ts` - Strict zod schemas (unknown keys are rejected) defining the YAML structure. Two ways to define actions:
  - `steps`: Simple shorthand syntax (`wait`, `navigate`, `waitForever`, `click`, `input`), full actions accepted too so both syntaxes can be mixed in order
  - `actions`: Full action objects with type discriminator (`GOTO`, `CLICK`, `TYPE`, etc.), run after `steps`
  - `.describe()` texts end up in the JSON Schema shown by editors on hover

- `src/yaml/json-schema.ts` - Generates the JSON Schema (`z.toJSONSchema`) published as `dist/schema.json` by `scripts/generate-schema.ts` (build step). `test/yaml/json-schema.spec.ts` checks it agrees with zod (ajv): extend its corpus when adding keys or actions.

- `src/yaml/resolver.ts` - Transforms validated YAML into domain model. Handles environment variable resolution (errors become `ConfigurationError`, resolved values are never logged):
  - `${VAR_NAME}` - Interpolation anywhere in URLs, selectors, typed texts, screenshot paths (`$${` = literal `${`); never in EVALUATE scripts
  - `$VAR_NAME` - Whole-value substitution (location, navigate, GOTO url, SCREENSHOT path only)
  - `$VAR_NAME[workerIndex]` - Indexed env var (comma-separated values, one per worker; location/navigate only; must provide at least one non-empty value per worker)

- `src/puppet/interpreter.ts` - Executes scenarios against Puppeteer. Manages workers, iterations, and parallel/sequential execution strategies.

- `src/core/model.ts` - TypeScript types for the domain model (Action, Scenario, Run, etc.)

**Execution model:**
- The whole configuration is validated and resolved before anything runs (fail fast with `ConfigurationError`)
- All scenarios start at the same time (also when they share a browser)
- Each scenario can have multiple workers running in parallel
- Workers can start with a delay (`PARALLEL` with `initialDelaySeconds`) or staggered (`SEQUENTIAL` with delay between workers)
- Each worker runs the scenario for the configured number of iterations; the start delay is applied once per worker, before its first iteration
- Each iteration runs in a fresh page that is always closed afterwards; a failed iteration does not stop the next iterations nor the other workers, and failures are reported at the end as an `AggregateError` of `WorkerError` (`scenarioName`, `workerIndex`, `iteration`)
- Waits (`wait`, `WAIT`, `WAIT_FOR_TIMEOUT`) run on the Node side, not inside the page, so they survive navigations
- Supports Chrome and Firefox browsers
