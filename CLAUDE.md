# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                # Run all tests with mocha
npm run test:coverage   # Run tests with coverage via nyc
npm run build           # Build with esbuild + tsc (outputs to dist/)
```

To run a single test file:
```bash
npx mocha --loader ts-node/esm -r ts-node/register test/yaml/parser.spec.ts
```

## Architecture

yaml-pptr is a library that transforms YAML configurations into Puppeteer browser automation actions.

**Pipeline flow:**
```
YAML string → parseYaml() → Resolver.resolve() → evalScenario() → Puppeteer actions
```

**Key modules:**

- `src/index.ts` - Main entry point exposing `readYamlAndInterpret()`. Groups scenarios by browser type and manages browser lifecycle.

- `src/yaml/parser.ts` - Parses YAML string using js-yaml and validates with zod schema.

- `src/yaml/validator.ts` - Zod schemas defining the YAML structure. Two ways to define actions:
  - `steps`: Simple shorthand syntax (`wait`, `navigate`, `waitForever`)
  - `actions`: Full action objects with type discriminator (`GOTO`, `CLICK`, `TYPE`, etc.)

- `src/yaml/resolver.ts` - Transforms validated YAML into domain model. Handles environment variable resolution:
  - `$VAR_NAME` - Simple env var substitution
  - `$VAR_NAME[workerIndex]` - Indexed env var (comma-separated values, one per worker)

- `src/puppet/interpreter.ts` - Executes scenarios against Puppeteer. Manages workers, iterations, and parallel/sequential execution strategies.

- `src/core/model.ts` - TypeScript types for the domain model (Action, Scenario, Run, etc.)

**Execution model:**
- Each scenario can have multiple workers running in parallel
- Workers can start with a delay (`PARALLEL` with `initialDelaySeconds`) or staggered (`SEQUENTIAL` with delay between workers)
- Each worker runs the scenario for the configured number of iterations
- Supports Chrome and Firefox browsers
