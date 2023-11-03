import { expect } from 'chai';
import { parseYaml } from "../../src/yaml/parser"

describe("Yaml Parser", () => {
  it("parses basic", () => {

    const test = parseYaml(`
scenarios:
    - name: Scenario 1
      location: "http://example.com/page1"
      steps:
        - navigate: $TEST
    - name: Scenario 2
      location: $LOC
    - name: Scenario 3
      location: $LOC
      workers: 10
      steps: []
    - name: Scenario 4
      location: $LOC[workerIndex]`);

    expect(test.scenarios).to.be.instanceOf(Array).and.lengthOf(4);
    expect(test.scenarios[0].name).to.be.equal("Scenario 1");
    expect(test.scenarios[0].location).to.be.equal("http://example.com/page1");
    expect(test.scenarios[0].steps![0].navigate).to.be.equal("$TEST");
    expect(test.scenarios[0].workers).to.be.undefined;

    expect(test.scenarios[1].name).to.be.equal("Scenario 2");
    expect(test.scenarios[1].location).to.be.equal("$LOC");
    expect(test.scenarios[1].workers).to.be.undefined;
    expect(test.scenarios[1].steps).to.be.undefined;

    expect(test.scenarios[2].name).to.be.equal("Scenario 3");
    expect(test.scenarios[2].workers).to.be.equal(10);
    expect(test.scenarios[2].steps).to.be.instanceOf(Array).and.lengthOf(0);

    expect(test.scenarios[3].name).to.be.equal("Scenario 4");
    expect(test.scenarios[3].workers).to.be.undefined;
    expect(test.scenarios[3].steps).to.be.undefined;
    expect(test.scenarios[3].location).to.be.equal("$LOC[workerIndex]");

  });
});