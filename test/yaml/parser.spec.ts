import { expect } from 'chai';
import {parseYaml} from "../../src/yaml/parser"

describe("Yaml Parser", () => {
    it("parse basic", () => {

        const test = parseYaml(`
scenarios:
    - name: Scenario 1
      steps:
        - action: NAVIGATE
          url: "http://example.com/page1"
        - action: NAVIGATE
          url: $TEST
    - name: Scenario 2
      location: $LOC
    - name: Scenario 3
      steps: []`);

        expect(test.scenarios).to.be.instanceOf(Array).and.lengthOf(3);
        expect(test.scenarios[0].name).to.be.equal("Scenario 1");
        expect(test.scenarios[0].steps![0].action).to.be.equal("NAVIGATE");
        expect(test.scenarios[0].steps![0].url).to.be.equal("http://example.com/page1");
        expect(test.scenarios[0].steps![1].action).to.be.equal("NAVIGATE");
        expect(test.scenarios[0].steps![1].url).to.be.equal("$TEST");

        expect(test.scenarios[1].name).to.be.equal("Scenario 2");
        expect(test.scenarios[1].location).to.be.equal("$LOC");
        expect(test.scenarios[1].steps).to.be.undefined;

        expect(test.scenarios[2].name).to.be.equal("Scenario 3");
        expect(test.scenarios[2].steps).to.be.instanceOf(Array).and.lengthOf(0);

    });
});