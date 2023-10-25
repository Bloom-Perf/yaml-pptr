import { expect } from 'chai';
import {readYamlAndInterpret} from "../src";

describe("Integration tests", () => {

    const createMockedBrowser = (g = {}) => ({
        gotos() {
            return g;
        },
        async newPage() {
            console.log(`-> newPage`)
            return Promise.resolve({
                async goto(str: string) {
                    console.log(`-> goto ${str}`)
                    g[str] = 1;
                    return Promise.resolve();
                }
            });
        }
    } as any);

    it("basic test", async () => {
        const mockedBrowser = createMockedBrowser();

        process.env["LOC"] = "http://loc.com";
        process.env["TEST"] = "http://test.com";

        const test = readYamlAndInterpret(`
scenarios:
    - name: Scenario 1
      steps:
        - navigate: "http://example.com/page1"
        - navigate: $TEST
    - name: Scenario 2
      location: $LOC
    - name: Scenario 3
      steps: []`);

        await test(mockedBrowser);


        expect(Object.keys(mockedBrowser.gotos())).to.include.members([
            "http://loc.com",
            "http://test.com",
            "http://example.com/page1"
        ]);

    });
});