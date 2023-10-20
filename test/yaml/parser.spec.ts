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
    - name: Scenario 2
      steps: []
        `)
        expect(test.scenarios).to.be.instanceOf(Array).and.lengthOf(2);

    });
});