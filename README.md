# yaml-pptr

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/bloom-perf/yaml-pptr/ci.yml?style=for-the-badge&branch=main)
![GitHub release (with filter)](https://img.shields.io/github/v/release/bloom-perf/yaml-pptr?style=for-the-badge)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge)](https://opensource.org/licenses/Apache-2.0)

A library to generate puppeteer browser controls through a YAML, scenario oriented api.

```yaml
scenarios:
  - name: "Scenario 1" # Default `Scenario 1`
    initialDelaySeconds: 10 # default 0
    location: "http://example.com/page1"
    workers: 10 # Default 1
    iterations: 1 # Default Infinity
    steps:
      - click: "#elementId1"
      - waitSeconds: 3
      - input:
          selector: ".inputField"
          text: "Hello, World!"
      - scrollDown: 500
      - scrollUp: 200
  - name: "Scenario 2"
    steps:
      - hover: "#hoverElement"
      - assertText:
          selector: ".output"
          expectedText: "Expected Output"
```