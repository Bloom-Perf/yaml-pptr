import fs from "fs";
import { createConf, logConf } from "./conf";
import express from "express";
import { createMetricsEmitter, createPromRegister } from "./metrics";
import { launchActionYaml } from "./main";


/*
Setup configuration:

Example:
    const conf = createConf({
        nbBrowsers: 1,
        nbTabs: 5,
        headless: true,
        httpPort: 8080
    });

*/

const conf = createConf({
    nbBrowsers: 1,
    nbTabs: 1,
    headless: false,
    httpPort: 8080
});

// const conf = createConf({});
logConf(conf);

const promRegistry = createPromRegister();
const metricsEmitter = createMetricsEmitter(promRegistry);

// Launching browsers and tabs altogether
launchActionYaml(conf, metricsEmitter)
    .catch(err => console.error("Fatal error when launching browsers: " + err));

// Start http server to expose prometheus metrics
express()
    .get(conf.httpMetricsRoute, async (_req, res, _oth) => {
        res.set('Content-Type', promRegistry.contentType);
        const flushedMetrics = await promRegistry.metrics();
        res.end(flushedMetrics);
    })
    .listen(conf.httpPort);
