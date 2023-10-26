import { expect } from 'chai';
import {Resolver} from "../../src/yaml/resolver"
import { RootYaml } from '../../src/yaml/validator';
import { ActionType } from '../../src/core/model';

describe("Yaml Resolver", () => {

    it("resolves basically", () => {

        const resolver = new Resolver(v => {
            if (v == "TEST") return "TEST_VALUE";
            if (v == "LOC") return "LOC_VALUE";
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
                    steps: [
                        {navigate: "http://test.com"}
                    ]
                },
                {
                    name: "#4",
                    steps: [
                        {navigate: "$LOC"}
                    ]
                },
                {
                    name: "#5",
                    location: "http://test.com",
                    workers: 5
                },
            ]
        }

        const core = resolver.resolve(yaml);

        expect(core.scenarios).to.be.instanceOf(Array).and.lengthOf(5);
        expect(core.scenarios[0].name).to.be.equal("#1");
        expect(core.scenarios[0].actions![0].actionType).to.be.equal(ActionType.Navigate);
        expect(core.scenarios[0].actions![0].url).to.be.equal("TEST_VALUE");
        expect(core.scenarios[0].mode).to.be.deep.equal({oneshot: 1});

        expect(core.scenarios[1].name).to.be.equal("#2");
        expect(core.scenarios[1].actions![0].actionType).to.be.equal(ActionType.Navigate);
        expect(core.scenarios[1].actions![0].url).to.be.equal("http://test.com");
        expect(core.scenarios[1].mode).to.be.deep.equal({oneshot: 1});

        expect(core.scenarios[2].name).to.be.equal("#3");
        expect(core.scenarios[2].actions![0].actionType).to.be.equal(ActionType.Navigate);
        expect(core.scenarios[2].actions![0].url).to.be.equal("http://test.com");
        expect(core.scenarios[2].mode).to.be.deep.equal({oneshot: 1});

        expect(core.scenarios[3].name).to.be.equal("#4");
        expect(core.scenarios[3].actions![0].actionType).to.be.equal(ActionType.Navigate);
        expect(core.scenarios[3].actions![0].url).to.be.equal("LOC_VALUE");
        expect(core.scenarios[3].mode).to.be.deep.equal({oneshot: 1});

        expect(core.scenarios[4].name).to.be.equal("#5");
        expect(core.scenarios[4].actions![0].actionType).to.be.equal(ActionType.Navigate);
        expect(core.scenarios[4].actions![0].url).to.be.equal("http://test.com");
        expect(core.scenarios[4].mode).to.be.deep.equal({oneshot: 5});

    });
});