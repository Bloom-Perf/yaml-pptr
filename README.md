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

## YAML Reference

### Scenario Configuration

Each scenario supports the following properties:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | string | `Scenario N` | Name of the scenario |
| `browser` | `chrome` \| `firefox` | `chrome` | Browser to use |
| `run` | `PARALLEL` \| `SEQUENTIAL` | `PARALLEL` | Worker initialization strategy |
| `initialDelaySeconds` | number | `0` | Delay before starting workers |
| `workers` | number | `1` | Number of parallel workers |
| `iterations` | number | `1` | Number of times each worker repeats the scenario |
| `location` | string | - | Starting URL (supports env vars) |
| `steps` | array | - | Simplified step syntax |
| `actions` | array | - | Full action syntax |

### Steps (Simplified Syntax)

Steps provide a concise way to define common actions.

#### navigate

Navigate to a URL.

```yaml
steps:
  - navigate: "http://example.com"
  - navigate: "$ENV_VAR"           # Using environment variable
```

#### click

Click on an element using CSS selector.

```yaml
steps:
  - click: "#submit-button"
  - click: ".nav-link"
```

#### input

Type text into an input field.

```yaml
steps:
  - input:
      selector: "#username"
      text: "myuser"
```

#### wait

Wait for a specified number of seconds.

```yaml
steps:
  - wait: 3    # Wait 3 seconds
```

#### waitForever

Wait indefinitely (useful for debugging or keeping browser open).

```yaml
steps:
  - waitForever
```

### Actions (Full Syntax)

Actions provide complete control with all available options. Use the `actions` array instead of `steps`.

#### GOTO

Navigate to a URL with options.

```yaml
actions:
  - type: GOTO
    url: "http://example.com"
    options:
      timeout: 30000                    # Navigation timeout in ms
      waitUntil: networkidle0           # load | domcontentloaded | networkidle0 | networkidle2
      referer: "http://referrer.com"    # Referer header
```

#### CLICK

Click on an element with options.

```yaml
actions:
  - type: CLICK
    selector: "#button"
    options:
      button: left       # left | right | middle
      clickCount: 2      # Number of clicks (e.g., 2 for double-click)
      delay: 100         # Delay between mousedown and mouseup in ms
```

#### TYPE

Type text into an element.

```yaml
actions:
  - type: TYPE
    selector: "#input-field"
    text: "Hello World"
    options:
      delay: 50          # Delay between key presses in ms
```

#### WAIT

Wait for a specified time in milliseconds.

```yaml
actions:
  - type: WAIT
    milliseconds: 2000
```

#### WAIT_FOR_SELECTOR

Wait for an element to appear.

```yaml
actions:
  - type: WAIT_FOR_SELECTOR
    selector: ".loaded-content"
    options:
      visible: true      # Wait for element to be visible
      hidden: false      # Wait for element to be hidden
      timeout: 5000      # Timeout in ms
```

#### WAIT_FOR_TIMEOUT

Wait for a specified timeout (alternative to WAIT).

```yaml
actions:
  - type: WAIT_FOR_TIMEOUT
    timeout: 1000
```

#### SCREENSHOT

Take a screenshot.

```yaml
actions:
  - type: SCREENSHOT
    path: "screenshot.png"
    options:
      type: png              # png | jpeg
      quality: 80            # Quality for jpeg (0-100)
      fullPage: true         # Capture full scrollable page
      omitBackground: false  # Hide default white background
      encoding: binary       # binary | base64
      clip:                  # Capture specific region
        x: 0
        y: 0
        width: 800
        height: 600
```

#### EVALUATE

Execute JavaScript in the browser context.

```yaml
actions:
  - type: EVALUATE
    script: "document.title"
```

#### SET_VIEWPORT

Set the browser viewport size.

```yaml
actions:
  - type: SET_VIEWPORT
    width: 1920
    height: 1080
```

#### PAUSE

Pause execution and wait for user input (press Enter to continue).

```yaml
actions:
  - type: PAUSE
```

#### CLOSE

Close the current page.

```yaml
actions:
  - type: CLOSE
```

### Environment Variables

You can use environment variables in `location` and `navigate` steps:

```yaml
# Simple variable
location: "$BASE_URL"

# Indexed variable (different value per worker)
location: "$URLS[workerIndex]"
```

Set indexed variables as comma-separated values:

```bash
export URLS="http://site1.com,http://site2.com,http://site3.com"
```

### Complete Example

```yaml
scenarios:
  - name: Login and Dashboard Test
    browser: chrome
    run: PARALLEL
    workers: 2
    iterations: 1
    location: "$APP_URL"
    steps:
      - input:
          selector: "#username"
          text: "testuser"
      - input:
          selector: "#password"
          text: "password123"
      - click: "#login-button"
      - wait: 2

  - name: Screenshot Test
    browser: chrome
    location: "http://example.com"
    actions:
      - type: SET_VIEWPORT
        width: 1920
        height: 1080
      - type: WAIT_FOR_SELECTOR
        selector: ".content"
        options:
          visible: true
      - type: SCREENSHOT
        path: "full-page.png"
        options:
          fullPage: true
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
