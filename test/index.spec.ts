// test/index.spec.ts
import { expect } from 'chai';
import { readYamlAndInterpret } from "../src/index";

interface CallLog {
    method: string;
    args: any[];
}

describe("Integration tests", () => {

    const createMockedBrowser = (g: { [k: string]: number } = {}, calls: CallLog[] = []) => ({
        gotos() {
            return g;
        },
        calls() {
            return calls;
        },
        async newPage() {
            console.log(`-> newPage`);
            return Promise.resolve({
                async goto(str: string) {
                    console.log(`-> goto ${str}`);
                    g[str] = (g[str] || 0) + 1;
                    calls.push({ method: 'goto', args: [str] });
                    return Promise.resolve();
                },
                async click(selector: string) {
                    console.log(`-> click ${selector}`);
                    calls.push({ method: 'click', args: [selector] });
                    return Promise.resolve();
                },
                async type(selector: string, text: string) {
                    console.log(`-> type ${selector} "${text}"`);
                    calls.push({ method: 'type', args: [selector, text] });
                    return Promise.resolve();
                },
                async evaluate() {
                    // Mock evaluate - used by wait action
                    calls.push({ method: 'evaluate', args: [] });
                    return Promise.resolve();
                },
                async close() {
                    console.log(`-> close`);
                    calls.push({ method: 'close', args: [] });
                    return Promise.resolve();
                }
            });
        },
    } as any);

    it("basic test", async () => {
        const mockedBrowser = createMockedBrowser();

        // Définir les variables d'environnement nécessaires
        process.env["LOC"] = "http://loc.com";
        process.env["TEST"] = "http://test.com";
        process.env["INDEXED"] = "http://test1.com,http://test2.com,http://test3.com";

        const yamlContent = `
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
      location: $INDEXED[workerIndex]`;

        // Appeler readYamlAndInterpret avec le mapping du navigateur
        await readYamlAndInterpret(yamlContent, { chrome: mockedBrowser });

        // Assertions pour vérifier que les URLs ont été visitées le nombre de fois attendu
        expect(Object.keys(mockedBrowser.gotos())).to.include.members([
            "http://noop.com",
            "http://loc.com",
            "http://test.com",
            "http://example.com/page1",
            "http://test1.com",
            "http://test2.com",
            "http://test3.com",
        ]);

        expect(mockedBrowser.gotos()["http://loc.com"]).to.equal(5);
        expect(mockedBrowser.gotos()["http://test.com"]).to.equal(1);
        expect(mockedBrowser.gotos()["http://example.com/page1"]).to.equal(1);
        expect(mockedBrowser.gotos()["http://test1.com"]).to.equal(1);
        expect(mockedBrowser.gotos()["http://test2.com"]).to.equal(1);
        expect(mockedBrowser.gotos()["http://test3.com"]).to.equal(1);
        expect(mockedBrowser.gotos()["http://noop.com"]).to.equal(1);
    });

    it("wait 1s", async () => {
        const mockedBrowser = createMockedBrowser();

        const yamlContent = `
scenarios:
    - iterations: 1
      location: "http://example.com/page1"
      steps:
        - wait: 1`;

        // Appeler readYamlAndInterpret avec le mapping du navigateur
        await readYamlAndInterpret(yamlContent, { chrome: mockedBrowser });

        // Vous pouvez ajouter des assertions spécifiques si nécessaire
    });

    it("click step", async () => {
        const calls: CallLog[] = [];
        const mockedBrowser = createMockedBrowser({}, calls);

        const yamlContent = `
scenarios:
    - iterations: 1
      location: "http://example.com/page1"
      steps:
        - click: "#submit-button"
        - click: ".nav-link"`;

        await readYamlAndInterpret(yamlContent, { chrome: mockedBrowser });

        const clickCalls = calls.filter(c => c.method === 'click');
        expect(clickCalls).to.have.lengthOf(2);
        expect(clickCalls[0].args[0]).to.equal('#submit-button');
        expect(clickCalls[1].args[0]).to.equal('.nav-link');
    });

    it("input step", async () => {
        const calls: CallLog[] = [];
        const mockedBrowser = createMockedBrowser({}, calls);

        const yamlContent = `
scenarios:
    - iterations: 1
      location: "http://example.com/login"
      steps:
        - input:
            selector: "#username"
            text: "testuser"
        - input:
            selector: "#password"
            text: "secret123"`;

        await readYamlAndInterpret(yamlContent, { chrome: mockedBrowser });

        const typeCalls = calls.filter(c => c.method === 'type');
        expect(typeCalls).to.have.lengthOf(2);
        expect(typeCalls[0].args[0]).to.equal('#username');
        expect(typeCalls[0].args[1]).to.equal('testuser');
        expect(typeCalls[1].args[0]).to.equal('#password');
        expect(typeCalls[1].args[1]).to.equal('secret123');
    });

    it("login flow with click and input steps", async () => {
        const calls: CallLog[] = [];
        const mockedBrowser = createMockedBrowser({}, calls);

        const yamlContent = `
scenarios:
    - name: Login Flow
      iterations: 1
      location: "http://example.com/login"
      steps:
        - input:
            selector: "#username"
            text: "admin"
        - input:
            selector: "#password"
            text: "password123"
        - click: "#login-button"
        - wait: 1`;

        await readYamlAndInterpret(yamlContent, { chrome: mockedBrowser });

        // Verify the sequence of calls
        const actionCalls = calls.filter(c => ['goto', 'type', 'click', 'evaluate'].includes(c.method));

        expect(actionCalls[0]).to.deep.equal({ method: 'goto', args: ['http://example.com/login'] });
        expect(actionCalls[1]).to.deep.equal({ method: 'type', args: ['#username', 'admin'] });
        expect(actionCalls[2]).to.deep.equal({ method: 'type', args: ['#password', 'password123'] });
        expect(actionCalls[3]).to.deep.equal({ method: 'click', args: ['#login-button'] });
        expect(actionCalls[4].method).to.equal('evaluate'); // wait action uses evaluate
    });
});
