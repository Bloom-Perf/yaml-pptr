import { expect } from 'chai';
import { Resolver } from "../../src/yaml/resolver"
import { RootYaml } from '../../src/yaml/validator';
import { ActionType, SupportedBrowser } from '../../src/core/model';

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
                    workers: 10
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
        expect(core.scenarios[3].workers).to.equal(10);

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
});
