import { expect } from 'chai';
import { parseYaml } from "../../src/yaml/parser.js"
import { ConfigurationError } from "../../src/core/errors.js"

describe("Yaml Parser", () => {
  it("parses basic", () => {

    const test = parseYaml(`
scenarios:
    - name: Scenario 1
      browser: chrome
      location: "http://example.com/page1"
      steps:
        - navigate: $TEST
    - name: Scenario 2
      browser: firefox
      location: $LOC
    - name: Scenario 3
      location: $LOC
      initialDelaySeconds: 5
      run: PARALLEL
      workers: 10
      steps: []
    - name: Scenario 4
      initialDelaySeconds: 10
      run: SEQUENTIAL
      location: $LOC[workerIndex]
    - location: $LOC[workerIndex]`);

    expect(test.scenarios).to.be.an('array').with.lengthOf(5);

    // Scenario 1
    expect(test.scenarios[0].name).to.equal("Scenario 1");
    expect(test.scenarios[0].browser).to.equal("chrome");
    expect(test.scenarios[0].location).to.equal("http://example.com/page1");
    expect(test.scenarios[0].steps![0]).to.deep.equal({ navigate: "$TEST" });
    expect(test.scenarios[0].workers).to.be.undefined;
    expect(test.scenarios[0].initialDelaySeconds).to.be.undefined;
    expect(test.scenarios[0].run).to.be.undefined;

    // Scenario 2
    expect(test.scenarios[1].name).to.equal("Scenario 2");
    expect(test.scenarios[1].browser).to.equal("firefox");
    expect(test.scenarios[1].location).to.equal("$LOC");
    expect(test.scenarios[1].workers).to.be.undefined;
    expect(test.scenarios[1].steps).to.be.undefined;
    expect(test.scenarios[1].initialDelaySeconds).to.be.undefined;
    expect(test.scenarios[1].run).to.be.undefined;

    // Scenario 3
    expect(test.scenarios[2].name).to.equal("Scenario 3");
    expect(test.scenarios[2].browser).to.be.undefined;
    expect(test.scenarios[2].workers).to.equal(10);
    expect(test.scenarios[2].steps).to.be.an('array').with.lengthOf(0);
    expect(test.scenarios[2].run).to.equal("PARALLEL");
    expect(test.scenarios[2].initialDelaySeconds).to.equal(5);

    // Scenario 4
    expect(test.scenarios[3].name).to.equal("Scenario 4");
    expect(test.scenarios[3].browser).to.be.undefined;
    expect(test.scenarios[3].workers).to.be.undefined;
    expect(test.scenarios[3].steps).to.be.undefined;
    expect(test.scenarios[3].location).to.equal("$LOC[workerIndex]");
    expect(test.scenarios[3].run).to.equal("SEQUENTIAL");
    expect(test.scenarios[3].initialDelaySeconds).to.equal(10);

    // Scenario 5
    expect(test.scenarios[4].name).to.be.undefined;
    expect(test.scenarios[4].browser).to.be.undefined;
    expect(test.scenarios[4].workers).to.be.undefined;
    expect(test.scenarios[4].steps).to.be.undefined;
    expect(test.scenarios[4].location).to.equal("$LOC[workerIndex]");
    expect(test.scenarios[4].run).to.be.undefined;
    expect(test.scenarios[4].initialDelaySeconds).to.be.undefined;

  });

  it("parses waitForever step", () => {

    const test = parseYaml(`
scenarios:
    - location: "http://example.com/page1"
      steps:
        - waitForever`);

    expect(test.scenarios).to.be.an('array').with.lengthOf(1);
    expect(test.scenarios[0].name).to.be.undefined;
    expect(test.scenarios[0].browser).to.be.undefined;
    expect(test.scenarios[0].location).to.equal("http://example.com/page1");
    expect(test.scenarios[0].steps![0]).to.deep.equal("waitForever");
    expect(test.scenarios[0].workers).to.be.undefined;
    expect(test.scenarios[0].initialDelaySeconds).to.be.undefined;
    expect(test.scenarios[0].run).to.be.undefined;

  });

  it("parses wait step", () => {

    const test = parseYaml(`
scenarios:
    - location: "http://example.com/page1"
      steps:
        - wait: 3`);

    expect(test.scenarios).to.be.an('array').with.lengthOf(1);
    expect(test.scenarios[0].name).to.be.undefined;
    expect(test.scenarios[0].browser).to.be.undefined;
    expect(test.scenarios[0].location).to.equal("http://example.com/page1");
    expect(test.scenarios[0].steps![0]).to.deep.equal({ wait: 3 });
    expect(test.scenarios[0].workers).to.be.undefined;
    expect(test.scenarios[0].initialDelaySeconds).to.be.undefined;
    expect(test.scenarios[0].run).to.be.undefined;

  });

  it("parses click step", () => {

    const test = parseYaml(`
scenarios:
    - location: "http://example.com/page1"
      steps:
        - click: "#submit-button"`);

    expect(test.scenarios).to.be.an('array').with.lengthOf(1);
    expect(test.scenarios[0].location).to.equal("http://example.com/page1");
    expect(test.scenarios[0].steps![0]).to.deep.equal({ click: "#submit-button" });

  });

  it("parses input step", () => {

    const test = parseYaml(`
scenarios:
    - location: "http://example.com/page1"
      steps:
        - input:
            selector: "#username"
            text: "testuser"`);

    expect(test.scenarios).to.be.an('array').with.lengthOf(1);
    expect(test.scenarios[0].location).to.equal("http://example.com/page1");
    expect(test.scenarios[0].steps![0]).to.deep.equal({
      input: {
        selector: "#username",
        text: "testuser"
      }
    });

  });

  describe("validation", () => {
    const expectConfigError = (yaml: string, ...expectedFragments: string[]) => {
      let caught: unknown;
      try {
        parseYaml(yaml);
      } catch (e) {
        caught = e;
      }
      expect(caught, "parseYaml should have thrown").to.be.instanceOf(ConfigurationError);
      for (const fragment of expectedFragments) {
        expect((caught as Error).message).to.include(fragment);
      }
    };

    it("rejects an unknown scenario key (typo) instead of ignoring it", () => {
      expectConfigError(`
scenarios:
    - location: "http://example.com"
      iteration: 5`, "Invalid scenario configuration", "iteration", "scenarios[0]");
    });

    it("rejects an unknown root key", () => {
      expectConfigError(`
scenario:
    - location: "http://example.com"`, "scenario");
    });

    it("rejects an unknown key in an action", () => {
      expectConfigError(`
scenarios:
    - actions:
        - type: CLICK
          selecter: "#ok"`, "selecter");
    });

    it("rejects an unknown key in action options", () => {
      expectConfigError(`
scenarios:
    - actions:
        - type: GOTO
          url: "http://example.com"
          options:
            waitUtil: load`, "waitUtil");
    });

    it("rejects a step mixing two shorthand keys", () => {
      expectConfigError(`
scenarios:
    - steps:
        - click: "#a"
          wait: 2`, "steps");
    });

    it("rejects non-integer or non-positive workers and iterations", () => {
      expectConfigError(`
scenarios:
    - workers: 1.5`, "workers");
      expectConfigError(`
scenarios:
    - iterations: 0`, "iterations");
    });

    it("rejects negative waits", () => {
      expectConfigError(`
scenarios:
    - steps:
        - wait: -1`, "steps");
      expectConfigError(`
scenarios:
    - actions:
        - type: WAIT
          milliseconds: -5`, "milliseconds");
    });

    it("reports YAML syntax errors as ConfigurationError", () => {
      expectConfigError(`
scenarios:
    - location: "http://example.com
      workers: [`, "Invalid YAML syntax");
    });

    it("accepts full actions among steps, in order", () => {
      const parsed = parseYaml(`
scenarios:
    - steps:
        - click: "#open"
        - type: WAIT_FOR_SELECTOR
          selector: ".menu"
        - wait: 1`);

      expect(parsed.scenarios[0].steps).to.deep.equal([
        { click: "#open" },
        { type: "WAIT_FOR_SELECTOR", selector: ".menu" },
        { wait: 1 },
      ]);
    });
  });
});
