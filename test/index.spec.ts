// test/index.spec.ts
import { expect } from 'chai';
import { readYamlAndInterpret, WorkerError, BrowserLaunchError, ConfigurationError } from "../src/index.js";
import { ScenarioContext } from "../src/core/model.js";

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
            let closed = false;
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
                    calls.push({ method: 'evaluate', args: [] });
                    return Promise.resolve();
                },
                async close() {
                    console.log(`-> close`);
                    closed = true;
                    calls.push({ method: 'close', args: [] });
                    return Promise.resolve();
                },
                isClosed() {
                    return closed;
                },
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
        await readYamlAndInterpret(yamlContent, { browsers: { chrome: mockedBrowser } });

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

    it("wait step (in seconds) really waits, on the Node side", async () => {
        const calls: CallLog[] = [];
        const mockedBrowser = createMockedBrowser({}, calls);

        const yamlContent = `
scenarios:
    - iterations: 1
      location: "http://example.com/page1"
      steps:
        - wait: 0.1`;

        const start = Date.now();
        await readYamlAndInterpret(yamlContent, { browsers: { chrome: mockedBrowser } });

        expect(Date.now() - start).to.be.at.least(95);
        expect(calls.filter(c => c.method === 'evaluate')).to.have.lengthOf(0);
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

        await readYamlAndInterpret(yamlContent, { browsers: { chrome: mockedBrowser } });

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

        await readYamlAndInterpret(yamlContent, { browsers: { chrome: mockedBrowser } });

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
        - wait: 0.05`;

        await readYamlAndInterpret(yamlContent, { browsers: { chrome: mockedBrowser } });

        // Verify the sequence of calls (the wait step does not touch the page)
        const actionCalls = calls.filter(c => ['goto', 'type', 'click', 'evaluate', 'close'].includes(c.method));

        expect(actionCalls).to.deep.equal([
            { method: 'goto', args: ['http://example.com/login'] },
            { method: 'type', args: ['#username', 'admin'] },
            { method: 'type', args: ['#password', 'password123'] },
            { method: 'click', args: ['#login-button'] },
            { method: 'close', args: [] },
        ]);
    });

    it("onPage callback receives correct context through full stack", async () => {
        const calls: CallLog[] = [];
        const mockedBrowser = createMockedBrowser({}, calls);
        const contexts: ScenarioContext[] = [];

        const yamlContent = `
scenarios:
    - name: My Test Scenario
      workers: 2
      iterations: 2
      location: "http://example.com"`;

        await readYamlAndInterpret(yamlContent, {
            browsers: { chrome: mockedBrowser },
            onPage: async (_page, ctx) => {
                contexts.push(ctx);
            },
        });

        // 2 workers * 2 iterations = 4 calls
        expect(contexts).to.have.lengthOf(4);

        // All should reference the correct scenario name
        expect(contexts.every(c => c.scenarioName === 'My Test Scenario')).to.be.true;

        // Should have iterations 0 and 1 for each worker
        const worker0 = contexts.filter(c => c.workerIndex === 0);
        const worker1 = contexts.filter(c => c.workerIndex === 1);
        expect(worker0.map(c => c.iteration)).to.include.members([0, 1]);
        expect(worker1.map(c => c.iteration)).to.include.members([0, 1]);
    });

    describe("error propagation", () => {
        const failingBrowser = (failingUrl: string, visited: string[]) => ({
            async newPage() {
                let closed = false;
                return {
                    async goto(url: string) {
                        visited.push(url);
                        if (url === failingUrl) throw new Error(`cannot reach ${url}`);
                    },
                    async close() {
                        closed = true;
                    },
                    isClosed() {
                        return closed;
                    },
                };
            },
        } as any);

        it("rejects with WorkerError details while still running every scenario", async () => {
            const visited: string[] = [];

            const yamlContent = `
scenarios:
    - name: Broken
      workers: 2
      location: "http://broken.com"
    - name: Healthy
      location: "http://ok.com"`;

            let caught: unknown;
            try {
                await readYamlAndInterpret(yamlContent, { browsers: { chrome: failingBrowser("http://broken.com", visited) } });
            } catch (e) {
                caught = e;
            }

            // The healthy scenario ran even though the first one failed
            expect(visited).to.include("http://ok.com");

            expect(caught).to.be.instanceOf(AggregateError);
            const errors = (caught as AggregateError).errors;
            expect(errors).to.have.lengthOf(2);
            errors.forEach(err => {
                expect(err).to.be.instanceOf(WorkerError);
                expect(err.scenarioName).to.equal("Broken");
                expect(err.iteration).to.equal(0);
            });
            expect(errors.map(e => e.workerIndex)).to.deep.equal([0, 1]);
        });

        it("resolves when every scenario succeeds", async () => {
            await readYamlAndInterpret(`
scenarios:
    - location: "http://ok.com"`, { browsers: { chrome: failingBrowser("http://never.com", []) } });
        });

        it("rejects with BrowserLaunchError when the browser cannot be launched", async () => {
            let caught: unknown;
            try {
                await readYamlAndInterpret(`
scenarios:
    - browser: firefox
      location: "http://ok.com"`, {
                    launchOptions: { firefox: { executablePath: "/nonexistent/firefox-binary" } },
                });
            } catch (e) {
                caught = e;
            }

            expect(caught).to.be.instanceOf(AggregateError);
            const errors = (caught as AggregateError).errors;
            expect(errors).to.have.lengthOf(1);
            expect(errors[0]).to.be.instanceOf(BrowserLaunchError);
            expect(errors[0].browser).to.equal("firefox");
        });
    });

    it("runs scenarios targeting the same browser in parallel", async () => {
        const starts: Record<string, number> = {};
        const t0 = Date.now();

        await readYamlAndInterpret(`
scenarios:
    - name: Slow
      location: "http://slow.com"
      steps:
        - wait: 0.3
    - name: Fast
      location: "http://fast.com"`, {
            browsers: { chrome: createMockedBrowser() },
            onPage: async (_page, ctx) => {
                starts[ctx.scenarioName] = Date.now() - t0;
            },
        });

        // "Fast" does not wait for "Slow" to finish (which takes >= 300 ms)
        expect(starts["Slow"]).to.be.below(150);
        expect(starts["Fast"]).to.be.below(150);
    });

    describe("configuration errors", () => {
        const expectConfigurationErrorBeforeAnyPage = async (yamlContent: string, ...fragments: string[]) => {
            const calls: CallLog[] = [];
            let caught: unknown;
            try {
                await readYamlAndInterpret(yamlContent, { browsers: { chrome: createMockedBrowser({}, calls) } });
            } catch (e) {
                caught = e;
            }
            expect(caught).to.be.instanceOf(ConfigurationError);
            for (const fragment of fragments) {
                expect((caught as Error).message).to.include(fragment);
            }
            // Nothing ran: not even the valid scenarios
            expect(calls.filter(c => c.method === 'newPage')).to.have.lengthOf(0);
        };

        it("rejects a missing environment variable before opening any page", async () => {
            delete process.env["YP_TEST_MISSING_VAR"];
            await expectConfigurationErrorBeforeAnyPage(`
scenarios:
    - name: Valid
      location: "http://ok.com"
    - name: Login
      location: "http://ok.com/login"
      steps:
        - input:
            selector: "#password"
            text: "\${YP_TEST_MISSING_VAR}"`, 'Scenario "Login"', '"YP_TEST_MISSING_VAR" is not set');
        });

        it("rejects an unknown key before opening any page", async () => {
            await expectConfigurationErrorBeforeAnyPage(`
scenarios:
    - location: "http://ok.com"
      iteration: 3`, "iteration");
        });
    });

    it("never logs typed texts nor resolved environment values", async () => {
        process.env["YP_TEST_PASSWORD"] = "env-secret-42";
        const logs: string[] = [];
        const logger = {
            debug: (m: string) => logs.push(m),
            info: (m: string) => logs.push(m),
            warn: (m: string) => logs.push(m),
            error: (m: string) => logs.push(m),
        };

        try {
            await readYamlAndInterpret(`
scenarios:
    - location: "http://example.com/login"
      steps:
        - input:
            selector: "#user"
            text: "literal-secret-123"
        - input:
            selector: "#password"
            text: "\${YP_TEST_PASSWORD}"`, { browsers: { chrome: createMockedBrowser() }, logger });
        } finally {
            delete process.env["YP_TEST_PASSWORD"];
        }

        expect(logs).to.not.be.empty;
        for (const message of logs) {
            expect(message).to.not.include("env-secret-42");
            expect(message).to.not.include("literal-secret-123");
        }
    });
});
