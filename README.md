# yaml-pptr

[![GitHub last commit (by committer)](https://img.shields.io/github/last-commit/bloom-perf/yaml-pptr?logo=github)](https://github.com/bloom-perf/yaml-pptr)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/bloom-perf/yaml-pptr/ci.yml?style=flat&branch=main)](https://github.com/Bloom-Perf/yaml-pptr/actions)
[![GitHub release (with filter)](https://img.shields.io/github/v/release/bloom-perf/yaml-pptr?style=flat)](https://github.com/Bloom-Perf/yaml-pptr/releases)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat)](https://opensource.org/licenses/Apache-2.0)

---

## Overview

**yaml-pptr** is a library that allows you to control web browsers using Puppeteer by simply defining your scenarios in YAML. It provides a scenario-oriented API that transforms a YAML configuration into a series of browser automation actions, making it easier to create and manage complex automation workflows without writing repetitive code.

---

## The Problem

Modern web testing and automation require flexibility and maintainability. Writing browser automation scripts directly with Puppeteer can be:

- **Verbose & Error-Prone:** Manually coding every step (navigation, click, type, etc.) can lead to redundant code and increased chances of mistakes.
- **Hard to Scale:** Managing multiple test scenarios and parallel execution requires additional boilerplate and synchronization logic.
- **Rigid Configurations:** Changes in test parameters often require code modifications rather than simple configuration tweaks.

---

## How yaml-pptr Solves the Problem

- **Human-Readable Configuration:**  
  Define your test scenarios in a simple YAML format. Each scenario specifies the target URL, execution mode, number of workers, iterations, and a sequence of actions.

- **Automatic Parsing & Validation:**  
  The library uses [js-yaml](https://github.com/nodeca/js-yaml) for parsing YAML and [zod](https://github.com/colinhacks/zod) for schema validation. This ensures that your configuration is correctly structured before execution.

- **Environment Variable Resolution:**  
  Easily inject dynamic values (such as URLs or credentials) using environment variables. You can even specify indexed environment variables to provide different values to parallel workers.

- **Flexible Execution Strategies:**  
  Choose between parallel or sequential initialization of workers with configurable delays. This flexibility is ideal for both load testing and precise step-by-step automation.

- **Puppeteer Integration:**  
  Once parsed, the YAML is transformed into a series of Puppeteer actions—navigating to URLs, clicking elements, typing into fields, waiting for conditions, taking screenshots, and more. The library supports both Chrome and Firefox (with Chrome as the default).

---

## Installation

Install the package via npm:

```bash
npm install @bloom-perf/yaml-pptr
```

---

## Usage

The core functionality is provided by the readYamlAndInterpret function, which reads your YAML content and executes the defined scenarios using Puppeteer.

### Basic Example

Below is an example of how to define a simple login scenario in YAML and run it:

```typescript
import { readYamlAndInterpret } from '@bloom-perf/yaml-pptr'

// Define your YAML configuration as a string
const yamlConfig = `
scenarios:
  - name: Login Test
    run: PARALLEL
    initialDelaySeconds: 5
    location: http://example.com/login
    workers: 1
    iterations: 1
    steps:
      - navigate: "$LOGIN_URL"
      - wait: 2
      - click: "#loginButton"
      - wait: 1
      - type:
          selector: "#username"
          text: "user123"
      - type:
          selector: "#password"
          text: "pass123"
      - click: "#submitButton"
`

// Set environment variable used in the YAML
process.env.LOGIN_URL = 'http://example.com/login'

// Execute the YAML-defined scenario
readYamlAndInterpret(yamlConfig).catch(console.error)
```

### Advanced Example with Multiple Scenarios

You can also define multiple scenarios with different execution strategies and environment variable configurations:

```yaml
scenarios:
  - name: Parallel Navigation Test
    run: PARALLEL
    initialDelaySeconds: 10
    location: "http://example.com/page1"
    workers: 5
    iterations: 1
    steps:
      - click: "#startButton"
      - wait: 3
      - type:
          selector: ".searchInput"
          text: "Query"
      - screenshot:
          path: "screenshot1.png"

  - name: Indexed URL Scenario
    run: SEQUENTIAL
    initialDelaySeconds: 5
    location: "$PAGE_URL[workerIndex]"
    workers: 3
    iterations: 1
    steps:
      - hover: "#menuItem"
      - assertText:
          selector: ".result"
          expectedText: "Success"
```

In the second scenario, the location field uses an environment variable with an index. Before running, set the environment variable appropriately:

```bash
export PAGE_URL="http://example.com/page1,http://example.com/page2,http://example.com/page3"
```

---

## Running Tests

The project includes a comprehensive test suite. To run the tests:

```bash
npm test
````

For test coverage:

```bash
npm run test:coverage
```

---

## Building the Project

To build the project, run:

```bash
npm run build
```

This command uses esbuild and the TypeScript compiler to bundle and generate the distribution files.

---

## Contributing

Contributions are welcome! Please adhere to the repository’s contribution guidelines when submitting issues or pull requests.

---

## License

Yaml-pptr is licensed under the Licence [![Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg?label=&style=flat)](https://opensource.org/licenses/Apache-2.0).
