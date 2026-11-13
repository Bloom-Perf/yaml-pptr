import { expect } from 'chai';
import { Resolver } from "../../src/yaml/resolver.js"
import { RootYaml } from '../../src/yaml/validator.js';
import { ActionType, SupportedBrowser } from '../../src/core/model.js';
import { ConfigurationError } from '../../src/core/errors.js';

describe("Yaml Resolver", () => {

    it("resolves basically", () => {

        const resolver = new Resolver(v => {
            if (v == "TEST") return "TEST_VALUE";
            if (v == "LOC") return "LOC_VALUE";
            if (v == "INDEXED") return "http://test1.com, http://test2.com, http://test3.com";
            return "";
        })

        const yaml: RootYaml = {
            scenarios: [
                {
                    name: "#1",
                    browser: 'firefox',
                    location: "$TEST",
                },
                {
                    name: "#2",
                    location: "http://test.com",
                    workers: 5
                },
                {
                    name: "#3",
                    location: "$INDEXED[workerIndex]",
                    workers: 3
                },
            ]
        }

        const core = resolver.resolve(yaml);

        expect(core.scenarios).to.be.an('array').with.lengthOf(3);

        // Scenario #1
        expect(core.scenarios[0].name).to.equal("#1");
        expect(core.scenarios[0].browser).to.equal("firefox");
        expect(core.scenarios[0].actions[0]).to.deep.equal({ actionType: ActionType.Navigate, location: { url: "TEST_VALUE" } });
        expect(core.scenarios[0].workers).to.equal(1);

        // Scenario #2
        expect(core.scenarios[1].name).to.equal("#2");
        expect(core.scenarios[1].browser).to.equal("chrome"); // Navigateur par défaut
        expect(core.scenarios[1].actions[0]).to.deep.equal({ actionType: ActionType.Navigate, location: { url: "http://test.com" } });
        expect(core.scenarios[1].workers).to.equal(5);

        // Scenario #3
        expect(core.scenarios[2].name).to.equal("#3");
        expect(core.scenarios[2].browser).to.equal("chrome"); // Navigateur par défaut
        expect(core.scenarios[2].actions[0]).to.deep.equal({
            actionType: ActionType.Navigate,
            location: { workerIndex: ["http://test1.com", "http://test2.com", "http://test3.com"] }
        });
        expect(core.scenarios[2].workers).to.equal(3);

    });

    it("resolves run strategy correctly", () => {
        const resolver = new Resolver(v => "")

        const yaml: RootYaml = {
            scenarios: [
                {
                    name: "#1",
                    location: "http://test.com",
                },
                {
                    name: "#2",
                    browser: 'firefox',
                    location: "http://test.com",
                    initialDelaySeconds: 10
                }
            ]
        }

        const core = resolver.resolve(yaml);

        expect(core.scenarios).to.be.an('array').with.lengthOf(2);

        // Scenario #1
        expect(core.scenarios[0].name).to.equal("#1");
        expect(core.scenarios[0].browser).to.equal("chrome"); // Navigateur par défaut
        expect(core.scenarios[0].actions[0]).to.deep.equal({ actionType: ActionType.Navigate, location: { url: "http://test.com" } });
        expect(core.scenarios[0].workers).to.equal(1);
        expect(core.scenarios[0].run).to.deep.equal({ initialDelaySeconds: 0 });

        // Scenario #2
        expect(core.scenarios[1].name).to.equal("#2");
        expect(core.scenarios[1].browser).to.equal("firefox");
        expect(core.scenarios[1].actions[0]).to.deep.equal({ actionType: ActionType.Navigate, location: { url: "http://test.com" } });
        expect(core.scenarios[1].workers).to.equal(1);
        expect(core.scenarios[1].run).to.deep.equal({ initialDelaySeconds: 10 });

    });

    it("resolves wait action", () => {
        const resolver = new Resolver(v => "")

        const yaml: RootYaml = {
            scenarios: [
                {
                    location: "http://test.com",
                    steps: [
                        {
                            wait: 5
                        }
                    ]
                }
            ]
        }

        const core = resolver.resolve(yaml);

        expect(core.scenarios[0].browser).to.equal("chrome"); // Navigateur par défaut
        expect(core.scenarios[0].actions[0]).to.deep.equal({
            actionType: ActionType.Navigate,
            location: { url: "http://test.com" }
        });

        expect(core.scenarios[0].actions[1]).to.deep.equal({
            actionType: ActionType.Wait,
            milliseconds: 5000
        });
    });

    it("resolves defaults", () => {
        const resolver = new Resolver(v => "")

        const yaml: RootYaml = {
            scenarios: [
                {
                    location: "http://test.com",
                },
                {
                    location: "http://test2.com",
                },
            ]
        }

        const core = resolver.resolve(yaml);

        expect(core.scenarios).to.be.an('array').with.lengthOf(2);

        // Scenario 1
        expect(core.scenarios[0].name).to.equal("Scenario 1");
        expect(core.scenarios[0].browser).to.equal("chrome"); // Navigateur par défaut
        expect(core.scenarios[0].actions[0]).to.deep.equal({ actionType: ActionType.Navigate, location: { url: "http://test.com" } });
        expect(core.scenarios[0].workers).to.equal(1);
        expect(core.scenarios[0].run).to.deep.equal({ initialDelaySeconds: 0 });

        // Scenario 2
        expect(core.scenarios[1].name).to.equal("Scenario 2");
        expect(core.scenarios[1].browser).to.equal("chrome"); // Navigateur par défaut
        expect(core.scenarios[1].actions[0]).to.deep.equal({ actionType: ActionType.Navigate, location: { url: "http://test2.com" } });
        expect(core.scenarios[1].workers).to.equal(1);
        expect(core.scenarios[1].run).to.deep.equal({ initialDelaySeconds: 0 });

    });

    it("resolves click step", () => {
        const resolver = new Resolver(v => "")

        const yaml: RootYaml = {
            scenarios: [
                {
                    location: "http://test.com",
                    steps: [
                        {
                            click: "#submit-button"
                        }
                    ]
                }
            ]
        }

        const core = resolver.resolve(yaml);

        expect(core.scenarios[0].actions[0]).to.deep.equal({
            actionType: ActionType.Navigate,
            location: { url: "http://test.com" }
        });

        expect(core.scenarios[0].actions[1]).to.deep.equal({
            actionType: ActionType.Click,
            selector: "#submit-button"
        });
    });

    it("resolves input step", () => {
        const resolver = new Resolver(v => "")

        const yaml: RootYaml = {
            scenarios: [
                {
                    location: "http://test.com",
                    steps: [
                        {
                            input: {
                                selector: "#username",
                                text: "testuser"
                            }
                        }
                    ]
                }
            ]
        }

        const core = resolver.resolve(yaml);

        expect(core.scenarios[0].actions[0]).to.deep.equal({
            actionType: ActionType.Navigate,
            location: { url: "http://test.com" }
        });

        expect(core.scenarios[0].actions[1]).to.deep.equal({
            actionType: ActionType.Type,
            selector: "#username",
            text: "testuser"
        });
    });

    it("resolves WAIT action milliseconds as-is (no seconds conversion)", () => {
        const resolver = new Resolver(v => "")

        const yaml: RootYaml = {
            scenarios: [
                {
                    actions: [
                        { type: "WAIT", milliseconds: 2000 }
                    ]
                }
            ]
        }

        const core = resolver.resolve(yaml);

        expect(core.scenarios[0].actions[0]).to.deep.equal({
            actionType: ActionType.Wait,
            milliseconds: 2000
        });
    });

    describe("environment variables", () => {
        const env: Record<string, string> = {
            BASE_URL: "https://shop.test",
            USER_NAME: "alice",
            PASSWORD: "s3cr3t-P@ss",
            FIELD: "login",
            OUT: "/tmp/out",
            URLS: "https://a.test, https://b.test, https://c.test",
            HOLES: "https://a.test,,https://c.test",
        };
        const resolverWith = (logs: string[] = []) => new Resolver(
            name => {
                if (env[name]) return env[name];
                throw new Error(`environment variable "${name}" is not set (or empty)`);
            },
            { debug: m => logs.push(m), info: m => logs.push(m), warn: m => logs.push(m), error: m => logs.push(m) }
        );
        type ScenarioYaml = RootYaml["scenarios"][number];
        const resolveOne = (scenario: ScenarioYaml, logs: string[] = []) =>
            resolverWith(logs).resolve({ scenarios: [scenario] }).scenarios[0];
        const expectConfigError = (scenario: ScenarioYaml, ...fragments: string[]) => {
            let caught: unknown;
            try {
                resolveOne(scenario);
            } catch (e) {
                caught = e;
            }
            expect(caught, "resolve should have thrown").to.be.instanceOf(ConfigurationError);
            for (const fragment of fragments) {
                expect((caught as Error).message).to.include(fragment);
            }
        };

        it("interpolates ${VAR} in URLs, selectors, typed texts and paths", () => {
            const scenario = resolveOne({
                location: "${BASE_URL}/login",
                steps: [
                    { input: { selector: "#${FIELD}", text: "${USER_NAME}" } },
                    { click: "button[name=${FIELD}]" },
                    { navigate: "${BASE_URL}/cart" },
                ],
                actions: [
                    { type: "TYPE", selector: "#password", text: "${PASSWORD}" },
                    { type: "CLICK", selector: "#${FIELD}-submit" },
                    { type: "WAIT_FOR_SELECTOR", selector: ".${FIELD}-ok" },
                    { type: "GOTO", url: "${BASE_URL}/account", options: { referer: "${BASE_URL}/" } },
                    { type: "SCREENSHOT", path: "${OUT}/account.png" },
                ],
            });

            expect(scenario.actions).to.deep.equal([
                { actionType: ActionType.Navigate, location: { url: "https://shop.test/login" } },
                { actionType: ActionType.Type, selector: "#login", text: "alice" },
                { actionType: ActionType.Click, selector: "button[name=login]" },
                { actionType: ActionType.Navigate, location: { url: "https://shop.test/cart" } },
                { actionType: ActionType.Type, selector: "#password", text: "s3cr3t-P@ss", options: undefined },
                { actionType: ActionType.Click, selector: "#login-submit", options: undefined },
                { actionType: ActionType.WaitForSelector, selector: ".login-ok", options: undefined },
                { actionType: ActionType.Goto, url: "https://shop.test/account", options: { referer: "https://shop.test/" } },
                { actionType: ActionType.Screenshot, path: "/tmp/out/account.png", options: undefined },
            ]);
        });

        it("keeps the whole-value $VAR syntax for location, navigate, GOTO url and SCREENSHOT path", () => {
            const scenario = resolveOne({
                location: "$BASE_URL",
                steps: [{ navigate: "$BASE_URL" }],
                actions: [
                    { type: "GOTO", url: "$BASE_URL" },
                    { type: "SCREENSHOT", path: "$OUT" },
                ],
            });

            expect(scenario.actions).to.deep.equal([
                { actionType: ActionType.Navigate, location: { url: "https://shop.test" } },
                { actionType: ActionType.Navigate, location: { url: "https://shop.test" } },
                { actionType: ActionType.Goto, url: "https://shop.test", options: undefined },
                { actionType: ActionType.Screenshot, path: "/tmp/out", options: undefined },
            ]);
        });

        it("keeps a literal $ in typed texts and selectors (no whole-value $VAR there)", () => {
            const scenario = resolveOne({
                steps: [{ input: { selector: "a[href$='.pdf']", text: "$ecret 100$" } }],
            });

            expect(scenario.actions[0]).to.deep.equal({ actionType: ActionType.Type, selector: "a[href$='.pdf']", text: "$ecret 100$" });
        });

        it("turns $${ into a literal ${", () => {
            const scenario = resolveOne({ steps: [{ input: { selector: "#tpl", text: "$${NOT_A_VAR} and ${USER_NAME}" } }] });

            expect(scenario.actions[0]).to.deep.equal({ actionType: ActionType.Type, selector: "#tpl", text: "${NOT_A_VAR} and alice" });
        });

        it("never interpolates EVALUATE scripts", () => {
            const scenario = resolveOne({ actions: [{ type: "EVALUATE", script: "console.log(`${PASSWORD}`)" }] });

            expect(scenario.actions[0]).to.deep.equal({ actionType: ActionType.Evaluate, script: "console.log(`${PASSWORD}`)" });
        });

        it("reports a missing variable as a ConfigurationError naming the scenario", () => {
            expectConfigError({ name: "Checkout", steps: [{ input: { selector: "#u", text: "${MISSING}" } }] },
                'Scenario "Checkout"', '"MISSING" is not set');
        });

        it("explains how to insert a variable inside a value", () => {
            expectConfigError({ location: "$BASE_URL/login" }, "$BASE_URL/login", "${VAR}");
        });

        it("explains that per-worker values are only supported by location and navigate", () => {
            expectConfigError({ steps: [{ input: { selector: "#u", text: "${USERS[workerIndex]}" } }] }, "location and navigate");
            expectConfigError({ actions: [{ type: "GOTO", url: "$URLS[workerIndex]" }] }, "location and navigate");
        });

        describe("per-worker values ($VAR[workerIndex])", () => {
            it("accepts as many (or more) values as workers", () => {
                const scenario = resolveOne({ location: "$URLS[workerIndex]", workers: 2 });

                expect(scenario.actions[0]).to.deep.equal({
                    actionType: ActionType.Navigate,
                    location: { workerIndex: ["https://a.test", "https://b.test", "https://c.test"] },
                });
            });

            it("rejects fewer values than workers, before anything runs", () => {
                expectConfigError({ location: "$URLS[workerIndex]", workers: 5 }, '"URLS"', "3 value(s) for 5 worker(s)");
            });

            it("rejects empty values", () => {
                expectConfigError({ steps: [{ navigate: "$HOLES[workerIndex]" }], workers: 3 }, '"HOLES"', "empty value");
            });
        });

        it("never logs resolved values nor typed texts", () => {
            const logs: string[] = [];
            resolveOne({
                location: "${BASE_URL}/login",
                steps: [
                    { input: { selector: "#user", text: "literal-secret-123" } },
                    { input: { selector: "#password", text: "${PASSWORD}" } },
                ],
                actions: [{ type: "TYPE", selector: "#otp", text: "${PASSWORD}" }],
            }, logs);

            expect(logs).to.not.be.empty;
            for (const message of logs) {
                expect(message).to.not.include("s3cr3t-P@ss");
                expect(message).to.not.include("literal-secret-123");
            }
        });
    });

    it("resolves full actions written among steps, in order", () => {
        const resolver = new Resolver(() => "");
        const core = resolver.resolve({
            scenarios: [{
                steps: [
                    { click: "#open" },
                    { type: "WAIT_FOR_SELECTOR", selector: ".menu", options: { visible: true } },
                    { wait: 1 },
                    { type: "WAIT", milliseconds: 250 },
                ],
            }],
        });

        expect(core.scenarios[0].actions).to.deep.equal([
            { actionType: ActionType.Click, selector: "#open" },
            { actionType: ActionType.WaitForSelector, selector: ".menu", options: { visible: true } },
            { actionType: ActionType.Wait, milliseconds: 1000 },
            { actionType: ActionType.Wait, milliseconds: 250 },
        ]);
    });
});
