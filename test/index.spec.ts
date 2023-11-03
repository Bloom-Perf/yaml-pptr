import { expect } from 'chai';
import { readYamlAndInterpret } from "../src";

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
        process.env["INDEXED"] = "http://test1.com, http://test2.com, http://test3.com";

        const test = readYamlAndInterpret(`
scenarios:
    - name: Scenario 1
      iterations: 1
      location: "http://example.com/page1"
      steps:
        - navigate: $TEST
    - name: Scenario 2
      workers: 5
      iterations: 1
      location: $LOC
    - name: Scenario 3
      iterations: 1
      location: "http://noop.com"
      steps: []
    - name: Scenario 4
      workers: 3
      iterations: 1
      location: $INDEXED[workerIndex]`);

        await test(mockedBrowser);


        expect(Object.keys(mockedBrowser.gotos())).to.include.members([
            "http://noop.com",
            "http://loc.com",
            "http://test.com",
            "http://example.com/page1",
            "http://test1.com",
            "http://test2.com",
            "http://test3.com",
        ]);

        expect(mockedBrowser.gotos()["http://loc.com"]).to.be.equal(5);
        expect(mockedBrowser.gotos()["http://test.com"]).to.be.equal(1);
        expect(mockedBrowser.gotos()["http://example.com/page1"]).to.be.equal(1);
        expect(mockedBrowser.gotos()["http://test1.com"]).to.be.equal(1);
        expect(mockedBrowser.gotos()["http://test2.com"]).to.be.equal(1);
        expect(mockedBrowser.gotos()["http://test3.com"]).to.be.equal(1);

        expect(mockedBrowser.gotos()["http://noop.com"]).to.be.equal(1);

    });
});