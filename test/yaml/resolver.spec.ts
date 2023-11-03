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
        expect(core.scenarios[0].actions![0].actionType).to.be.equal(ActionType.Navigate);
        expect(core.scenarios[0].actions![0].location).to.be.deep.equal({ url: "TEST_VALUE" });
        expect(core.scenarios[0].workers).to.be.equal(1);

        expect(core.scenarios[1].name).to.be.equal("#2");
        expect(core.scenarios[1].actions![0].actionType).to.be.equal(ActionType.Navigate);
        expect(core.scenarios[1].actions![0].location).to.be.deep.equal({ url: "http://test.com" });
        expect(core.scenarios[1].workers).to.be.equal(1);

        expect(core.scenarios[2].name).to.be.equal("#3");
        expect(core.scenarios[2].actions![0].actionType).to.be.equal(ActionType.Navigate);
        expect(core.scenarios[2].actions![0].location).to.be.deep.equal({ url: "http://test.com" });
        expect(core.scenarios[2].workers).to.be.equal(5);

        expect(core.scenarios[3].name).to.be.equal("#4");
        expect(core.scenarios[3].actions![0].actionType).to.be.equal(ActionType.Navigate);
        expect(core.scenarios[3].actions![0].location).to.be.deep.equal({ workerIndex: ["http://test1.com", "http://test2.com", "http://test3.com"] });
        expect(core.scenarios[3].workers).to.be.equal(10);

    });
});