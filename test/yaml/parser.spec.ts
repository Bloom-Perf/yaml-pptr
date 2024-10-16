import { expect } from 'chai';
import { parseYaml } from "../../src/yaml/parser"

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
});
