import prom from "prom-client";

export const enum Status {
    Success = "success",
    Error = "error"
}

export type MetricsEmitter = {
    browserStarted(name: string, status: Status): void
    browserTabStarted(status: Status): void
    browserScenarioUseCase(status: Status): void
}

export const createPromRegister = () => new prom.Registry();

export const createMetricsEmitter = (registry: prom.Registry): MetricsEmitter => {

    const startedBrowserCounter = new prom.Counter({
        name: "browser_started",
        help: "Browser started successfully",
        labelNames: ["browser", "status"],
        registers: [registry]
    });

    const browserScenarioUseCase = new prom.Counter({
        name: "carto_browser_usecase",
        help: "Scenario's working sucessfully",
        labelNames: ["status"],
        registers: [registry]
    });

    const startedBrowserTabCounter = new prom.Counter({
        name: "carto_browser_tab_started",
        help: "Browser Tab started successfully",
        labelNames: ["status"],
        registers: [registry]
    });

    return {
        browserStarted(name, status) {
            startedBrowserCounter.inc({ browser: name, status });
        },
        browserTabStarted(status) {
            startedBrowserTabCounter.inc({ status });
        },
        browserScenarioUseCase(status){
            browserScenarioUseCase.inc({ status });
        }
    };
};

