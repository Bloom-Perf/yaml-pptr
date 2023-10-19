import chalk from "chalk";
import fs from "fs";

export type Conf = {
    httpPort: number;
    httpMetricsRoute: string;
    nbBrowsers: number;
    nbTabs: number;
    headless: boolean;
}

export type ConfOverrides = Partial<{
    now: Date
    httpPort: number;
    httpMetricsRoute: string;
    nbBrowsers: number;
    nbTabs: number;
    headless: boolean;
}>;

export const logConf = (conf: Conf) => {
    console.log("Starting CartoTemplates with the following configuration:");

    console.log(
        Object
            .entries(conf)
            .filter(v => typeof v[1] !== "function")
            .map(([key, value]) =>
                "\t- " + chalk.blueBright(key) + "\t-> " + chalk.yellowBright(value.toString())
            ).join("\n")
    );
}

export const createConf = (overrides: ConfOverrides): Conf => {
    return {
        nbBrowsers: overrides.nbBrowsers || parseInt(process.env.DSD_NB_BROWSERS || "0"),
        nbTabs: overrides.nbTabs || parseInt(process.env.DSD_NB_TABS || "0"),
        headless: overrides.headless !== undefined && overrides.headless || !!process.env.DSD_HEADLESS,
        httpPort: overrides.httpPort || parseInt(process.env.DSD_HTTP_PORT || "0"),
        httpMetricsRoute: overrides.httpMetricsRoute || process.env.DSD_HTTP_METRICS_ROUTE || "/metrics"
    }
};
