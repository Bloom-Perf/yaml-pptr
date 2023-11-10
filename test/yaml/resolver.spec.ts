import { expect } from 'chai';
import { Resolver } from "../../src/yaml/resolver"
import { RootYaml } from '../../src/yaml/validator';
import { ActionType } from '../../src/core/model';

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
                    location: "$TEST",
                },
                {
                    name: "#2",
                    location: "http://test.com",
                },
                {
                    name: "#3",
                    location: "http://test.com",
                    workers: 5
                },
                {
                    name: "#4",
                    location: "$INDEXED[workerIndex]",
                    workers: 10
                },
            ]
        }

        const core = resolver.resolve(yaml);

        expect(core.scenarios).to.be.instanceOf(Array).and.lengthOf(4);
        expect(core.scenarios[0].name).to.be.equal("#1");
        expect(core.scenarios[0].actions![0]).to.be.deep.equal({ actionType: ActionType.Navigate, location: { url: "TEST_VALUE" } });
        expect(core.scenarios[0].workers).to.be.equal(1);

        expect(core.scenarios[1].name).to.be.equal("#2");
        expect(core.scenarios[1].actions![0]).to.be.deep.equal({ actionType: ActionType.Navigate, location: { url: "http://test.com" } });
        expect(core.scenarios[1].workers).to.be.equal(1);

        expect(core.scenarios[2].name).to.be.equal("#3");
        expect(core.scenarios[2].actions![0]).to.be.deep.equal({ actionType: ActionType.Navigate, location: { url: "http://test.com" } });
        expect(core.scenarios[2].workers).to.be.equal(5);

        expect(core.scenarios[3].name).to.be.equal("#4");
        expect(core.scenarios[3].actions![0]).to.be.deep.equal({ actionType: ActionType.Navigate, location: { workerIndex: ["http://test1.com", "http://test2.com", "http://test3.com"] } });
        expect(core.scenarios[3].workers).to.be.equal(10);

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
                    location: "http://test.com",
                    initialDelaySeconds: 10
                },
                {
                    name: "#3",
                    location: "http://test.com",
                    run: "SEQUENTIAL",
                    initialDelaySeconds: 10
                },
            ]
        }

        const core = resolver.resolve(yaml);

        expect(core.scenarios).to.be.instanceOf(Array).and.lengthOf(3);

        expect(core.scenarios[0].name).to.be.equal("#1");
        expect(core.scenarios[0].actions![0]).to.be.deep.equal({ actionType: ActionType.Navigate, location: { url: "http://test.com" } });
        expect(core.scenarios[0].workers).to.be.equal(1);
        expect(core.scenarios[0].run).to.be.deep.equal({ initialDelaySeconds: 0 });

        expect(core.scenarios[1].name).to.be.equal("#2");
        expect(core.scenarios[1].actions![0]).to.be.deep.equal({ actionType: ActionType.Navigate, location: { url: "http://test.com" } });
        expect(core.scenarios[1].workers).to.be.equal(1);
        expect(core.scenarios[1].run).to.be.deep.equal({ initialDelaySeconds: 10 });

        expect(core.scenarios[2].name).to.be.equal("#3");
        expect(core.scenarios[2].actions![0].actionType).to.be.equal(ActionType.Navigate);
        expect(core.scenarios[2].actions![0]).to.be.deep.equal({ actionType: ActionType.Navigate, location: { url: "http://test.com" } });
        expect(core.scenarios[2].workers).to.be.equal(1);
        expect(core.scenarios[2].run).to.be.deep.equal({ delaySecondsBetweenWorkerInits: 10 });

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


        expect(core.scenarios[0].actions[0]).to.be.deep.equal({
            actionType: ActionType.Navigate,
            location: { url: "http://test.com" }
        });

        expect(core.scenarios[0].actions[1]).to.be.deep.equal({
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

        expect(core.scenarios).to.be.instanceOf(Array).and.lengthOf(2);

        expect(core.scenarios[0].name).to.be.equal("Scenario 1");
        expect(core.scenarios[0].actions![0]).to.be.deep.equal({ actionType: ActionType.Navigate, location: { url: "http://test.com" } });
        expect(core.scenarios[0].workers).to.be.equal(1);
        expect(core.scenarios[0].run).to.be.deep.equal({ initialDelaySeconds: 0 });

        expect(core.scenarios[1].name).to.be.equal("Scenario 2");
        expect(core.scenarios[1].actions![0]).to.be.deep.equal({ actionType: ActionType.Navigate, location: { url: "http://test2.com" } });
        expect(core.scenarios[1].workers).to.be.equal(1);
        expect(core.scenarios[1].run).to.be.deep.equal({ initialDelaySeconds: 0 });


    });
});