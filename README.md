# yaml-pptr

[![GitHub last commit](https://img.shields.io/github/last-commit/bloom-perf/yaml-pptr?logo=github)](https://github.com/bloom-perf/yaml-pptr)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/bloom-perf/yaml-pptr/ci.yml?style=flat&branch=main)](https://github.com/Bloom-Perf/yaml-pptr/actions)
[![GitHub release](https://img.shields.io/github/v/release/bloom-perf/yaml-pptr?style=flat)](https://github.com/Bloom-Perf/yaml-pptr/releases)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat)](https://opensource.org/licenses/Apache-2.0)

**yaml-pptr** is a library that allows you to control web browsers using Puppeteer by defining your scenarios in YAML. No more verbose Puppeteer scripts - just simple, human-readable configuration files.

## Installation

```bash
npm install @bloom-perf/yaml-pptr
```

## Quick Start

```typescript
import { readYamlAndInterpret } from '@bloom-perf/yaml-pptr';

const yaml = `
scenarios:
  - name: Login Test
    location: "https://www.saucedemo.com"
    steps:
      - input:
          selector: "#user-name"
          text: "standard_user"
      - input:
          selector: "#password"
          text: "secret_sauce"
      - click: "#login-button"
      - wait: 2
`;

readYamlAndInterpret(yaml);
```

## Getting Started

### Project Structure

```
my-automation/
├── scenarios/
│   └── login-test.yaml
├── src/
│   └── runner.ts
├── package.json
└── tsconfig.json
```

### 1. Create a YAML scenario

**scenarios/login-test.yaml**

```yaml
scenarios:
  - name: Sauce Demo Login
    location: "https://www.saucedemo.com"
    steps:
      - input:
          selector: "#user-name"
          text: "standard_user"
      - input:
          selector: "#password"
          text: "secret_sauce"
      - click: "#login-button"
      - wait: 2
    actions:
      - type: WAIT_FOR_SELECTOR
        selector: ".inventory_list"
        options:
          visible: true
      - type: SCREENSHOT
        path: "screenshots/result.png"
        options:
          fullPage: true
```

### 2. Create a runner script

**src/runner.ts**

```typescript
import { readYamlAndInterpret } from '@bloom-perf/yaml-pptr';
import * as fs from 'fs';

const yaml = fs.readFileSync('./scenarios/login-test.yaml', 'utf-8');

fs.mkdirSync('./screenshots', { recursive: true });

readYamlAndInterpret(yaml)
  .then(() => console.log('Done!'))
  .catch(console.error);
```

### 3. Run it

```bash
npx ts-node src/runner.ts
```

## YAML Reference

### Scenario Configuration

| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `name` | string | `Scenario N` | Scenario name |
| `browser` | `chrome` \| `firefox` | `chrome` | Browser to use |
| `run` | `PARALLEL` \| `SEQUENTIAL` | `PARALLEL` | Worker start strategy |
| `initialDelaySeconds` | number | `0` | Delay before starting |
| `workers` | number | `1` | Number of parallel workers |
| `iterations` | number | `1` | Repetitions per worker |
| `location` | string | - | Starting URL |
| `steps` | array | - | Simplified syntax |
| `actions` | array | - | Full syntax with options |

### Steps (Simplified Syntax)

#### click

```yaml
- click: "#submit-button"
```

#### input

```yaml
- input:
    selector: "#username"
    text: "myuser"
```

#### navigate

```yaml
- navigate: "http://example.com"
- navigate: "$ENV_VAR"
```

#### wait

```yaml
- wait: 3  # seconds
```

#### waitForever

```yaml
- waitForever
```

### Actions (Full Syntax)

Use `actions` instead of `steps` when you need advanced options.

#### GOTO

```yaml
- type: GOTO
  url: "http://example.com"
  options:
    timeout: 30000
    waitUntil: networkidle0  # load | domcontentloaded | networkidle0 | networkidle2
    referer: "http://referrer.com"
```

#### CLICK

```yaml
- type: CLICK
  selector: "#button"
  options:
    button: left     # left | right | middle
    clickCount: 2    # double-click
    delay: 100       # ms between mousedown/mouseup
```

#### TYPE

```yaml
- type: TYPE
  selector: "#input"
  text: "Hello"
  options:
    delay: 50  # ms between keystrokes
```

#### WAIT

```yaml
- type: WAIT
  milliseconds: 2000
```

#### WAIT_FOR_SELECTOR

```yaml
- type: WAIT_FOR_SELECTOR
  selector: ".loaded"
  options:
    visible: true
    hidden: false
    timeout: 5000
```

#### WAIT_FOR_TIMEOUT

```yaml
- type: WAIT_FOR_TIMEOUT
  timeout: 1000
```

#### SCREENSHOT

```yaml
- type: SCREENSHOT
  path: "screenshot.png"
  options:
    type: png          # png | jpeg
    quality: 80        # jpeg quality (0-100)
    fullPage: true
    omitBackground: false
    encoding: binary   # binary | base64
    clip:
      x: 0
      y: 0
      width: 800
      height: 600
```

#### EVALUATE

```yaml
- type: EVALUATE
  script: "document.title"
```

#### SET_VIEWPORT

```yaml
- type: SET_VIEWPORT
  width: 1920
  height: 1080
```

#### PAUSE

```yaml
- type: PAUSE  # Press Enter to continue
```

#### CLOSE

```yaml
- type: CLOSE
```

## Environment Variables

Use `$VAR_NAME` syntax in `location` or `navigate`:

```yaml
location: "$BASE_URL"
```

```bash
BASE_URL=https://example.com npx ts-node runner.ts
```

### Indexed Variables

Assign different values to each worker using `$VAR[workerIndex]`:

```yaml
scenarios:
  - name: Multi-URL Test
    workers: 3
    location: "$URLS[workerIndex]"
    steps:
      - wait: 2
```

```bash
URLS="https://site1.com,https://site2.com,https://site3.com" npx ts-node runner.ts
```

Worker 0 gets `site1.com`, worker 1 gets `site2.com`, etc.

## Load Testing Example

```yaml
scenarios:
  - name: Load Test
    run: PARALLEL
    workers: 10
    iterations: 5
    location: "https://example.com"
    steps:
      - click: "#action-button"
      - wait: 1
```

This runs 10 workers in parallel, each executing the scenario 5 times.

## Development

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build
npm run build
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

[Apache 2.0](https://opensource.org/licenses/Apache-2.0)
