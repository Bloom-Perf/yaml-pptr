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
                    g[str] = (g[str] || 0) + 1;
                    return Promise.resolve();
                },
                async close() {
                    console.log(`-> close`)
                    return Promise.resolve();
                }
            });
            
        },
        
    } as any);

    it("basic test", async () => {
        const mockedBrowser = createMockedBrowser();

        process.env["LOC"] = "http://loc.com";
        process.env["TEST"] = "http://test.com";

        const test = readYamlAndInterpret(`
scenarios:
    - name: Scenario 1
      iterations: 1
      steps:
        - navigate: "http://example.com/page1"
        - navigate: $TEST
    - name: Scenario 2
      workers: 5
      iterations: 1
      location: $LOC
    - name: Scenario 3
      iterations: 1
      steps: []`);

        await test(mockedBrowser);


        expect(Object.keys(mockedBrowser.gotos())).to.include.members([
            "http://loc.com",
            "http://test.com",
            "http://example.com/page1"
        ]);

        expect(mockedBrowser.gotos()["http://loc.com"]).to.be.equal(5);
        expect(mockedBrowser.gotos()["http://test.com"]).to.be.equal(1);
        expect(mockedBrowser.gotos()["http://example.com/page1"]).to.be.equal(1);

    });
});