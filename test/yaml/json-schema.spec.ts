import { expect } from 'chai';
import * as fs from 'node:fs';
import * as yaml from 'js-yaml';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { buildJsonSchema } from '../../src/yaml/json-schema.js';
import { rootZod } from '../../src/yaml/validator.js';

// The JSON Schema is generated from the zod schema: both must agree on what
// is valid, otherwise editors would flag valid files (or accept invalid ones).

const schema = buildJsonSchema();
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

const expectAgreement = (label: string, content: string, expectedValid: boolean) => {
    const data = yaml.load(content);
    const zodValid = rootZod.safeParse(data).success;
    const jsonSchemaValid = validate(data);
    expect(zodValid, `${label}: zod`).to.equal(expectedValid);
    expect(jsonSchemaValid, `${label}: JSON Schema (${JSON.stringify(validate.errors?.[0])})`).to.equal(expectedValid);
};

const KITCHEN_SINK = `
scenarios:
  - name: Every step and action
    browser: firefox
    run: SEQUENTIAL
    initialDelaySeconds: 0.5
    workers: 2
    iterations: 3
    location: "\${BASE_URL}/login"
    steps:
      - navigate: "$URLS[workerIndex]"
      - wait: 1.5
      - click: "::-p-xpath(//button)"
      - input:
          selector: "#user"
          text: "\${APP_USER}"
      - type: CLICK
        selector: "#mixed"
      - waitForever
    actions:
      - type: GOTO
        url: "$BASE_URL"
        options:
          timeout: 30000
          waitUntil: [load, networkidle0]
          referer: "https://ref.test"
      - type: CLICK
        selector: "#button"
        options:
          button: right
          clickCount: 2
          delay: 100
      - type: TYPE
        selector: "#input"
        text: "Hello"
        options:
          delay: 50
      - type: WAIT_FOR_SELECTOR
        selector: ".loaded"
        options:
          visible: true
          hidden: false
          timeout: 5000
      - type: WAIT_FOR_TIMEOUT
        timeout: 1000
      - type: WAIT
        milliseconds: 2000
      - type: PAUSE
      - type: SCREENSHOT
        path: "out.png"
        options:
          type: jpeg
          quality: 80
          fullPage: true
          omitBackground: false
          encoding: binary
          clip: { x: 0, y: 0, width: 800, height: 600 }
      - type: EVALUATE
        script: "document.title"
      - type: SET_VIEWPORT
        width: 1920
        height: 1080
      - type: CLOSE
`;

describe('JSON Schema', () => {
    it('is a draft 2020-12 schema with a title', () => {
        expect(schema.$schema).to.equal('https://json-schema.org/draft/2020-12/schema');
        expect(schema.title).to.equal('yaml-pptr scenarios');
    });

    it('rejects unknown keys like the runtime validation', () => {
        const scenario = (schema as any).properties.scenarios.items;
        expect(scenario.additionalProperties).to.equal(false);
        expect(scenario.properties.location.description).to.be.a('string').and.not.be.empty;
    });

    describe('agrees with the runtime validation', () => {
        for (const file of ['examples/login-demo/scenario.yaml', 'examples/load-test/scenario.yaml']) {
            it(`accepts ${file}`, () => expectAgreement(file, fs.readFileSync(file, 'utf8'), true));
        }

        it('accepts every step, action and option', () => expectAgreement('kitchen sink', KITCHEN_SINK, true));

        const invalid: [string, string][] = [
            ['unknown root key', 'scenario:\n  - location: "http://x"\n'],
            ['typo in a scenario key', 'scenarios:\n  - iteration: 3\n'],
            ['unknown key in an action', 'scenarios:\n  - actions:\n      - type: CLICK\n        selecter: "#a"\n'],
            ['unknown key in options', 'scenarios:\n  - actions:\n      - type: GOTO\n        url: "http://x"\n        options:\n          waitUtil: load\n'],
            ['unknown action type', 'scenarios:\n  - actions:\n      - type: HOVER\n        selector: "#a"\n'],
            ['step mixing two shorthand keys', 'scenarios:\n  - steps:\n      - click: "#a"\n        wait: 2\n'],
            ['non-integer workers', 'scenarios:\n  - workers: 1.5\n'],
            ['zero iterations', 'scenarios:\n  - iterations: 0\n'],
            ['negative wait', 'scenarios:\n  - steps:\n      - wait: -1\n'],
            ['negative WAIT milliseconds', 'scenarios:\n  - actions:\n      - type: WAIT\n        milliseconds: -5\n'],
            ['quality above 100', 'scenarios:\n  - actions:\n      - type: SCREENSHOT\n        path: a.jpg\n        options:\n          quality: 101\n'],
            ['unsupported browser', 'scenarios:\n  - browser: safari\n'],
            ['unknown waitUntil', 'scenarios:\n  - actions:\n      - type: GOTO\n        url: "http://x"\n        options:\n          waitUntil: idle\n'],
            ['missing required field', 'scenarios:\n  - actions:\n      - type: TYPE\n        selector: "#a"\n'],
        ];
        for (const [label, content] of invalid) {
            it(`rejects: ${label}`, () => expectAgreement(label, content, false));
        }
    });
});
