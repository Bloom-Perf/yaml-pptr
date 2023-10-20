# yaml-pptr

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/bloom-perf/yaml-pptr/ci.yml?style=for-the-badge&branch=main)
![GitHub release (with filter)](https://img.shields.io/github/v/release/bloom-perf/yaml-pptr?style=for-the-badge)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge)](https://opensource.org/licenses/Apache-2.0)

A library to generate puppeteer browser controls through a YAML api.

```yaml
browser: FIREFOX # default CHROME
run: SEQUENTIAL # default PARALLEL
delaySeconds: 10 # default 0
scenarios:
  - name: Scenario 1
    steps:
      - action: CLICK
        selector: "#elementId1"
      - action: NAVIGATE
        url: "http://example.com/page1"
      - action: WAIT
        seconds: 3
      - action: INPUT
        selector: ".inputField"
        text: "Hello, World!"
      - action: SCROLL
        direction: DOWN
        pixels: 500
  - name: Scenario 2
    steps:
      - action: HOVER
        selector: "#hoverElement"
      - action: ASSERT_TEXT
        selector: ".output"
        expectedText: "Expected Output"
      - action: SCROLL
        direction: UP
        pixels: 200 
```