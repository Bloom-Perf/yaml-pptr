import * as p from 'puppeteer';
import { SupportedBrowser } from '../core/model.js';

const defaultArgs = (browser: SupportedBrowser, headless: boolean): string[] => {
    if (browser === 'firefox') {
        // Puppeteer already runs Firefox in an isolated temporary profile.
        return [];
    }
    const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--ignore-certificate-errors',
    ];
    if (!headless) {
        args.push('--start-maximized');
    }
    return args;
};

/**
 * Builds Puppeteer launch options for the given browser. The browser is
 * selected with `browser` (not `channel`, which only accepts Chrome release
 * channels). User options override defaults; user `args` are appended.
 */
export const buildLaunchOptions = (browser: SupportedBrowser, headless: boolean, extra: p.LaunchOptions = {}): p.LaunchOptions => ({
    browser,
    headless,
    acceptInsecureCerts: true,
    ...extra,
    args: [...defaultArgs(browser, headless), ...(extra.args ?? [])],
});

let previousLaunch: Promise<unknown> = Promise.resolve();

/**
 * Runs `launch` once the launches queued before it are over, whatever their outcome.
 *
 * Puppeteer resolves the browser binary from state shared by all its launches (the browser
 * launched last, read after asynchronous steps): launching Chrome and Firefox at the same
 * time made Firefox look for Chrome's version ("Could not find Firefox (ver. 157...)").
 */
export const queueLaunch = <T>(launch: () => Promise<T>): Promise<T> => {
    const result = previousLaunch.then(launch);
    previousLaunch = result.catch(() => undefined);
    return result;
};

/** Launches a browser, one at a time (see `queueLaunch`) */
export const launchBrowser = (browser: SupportedBrowser, headless: boolean, extra?: p.LaunchOptions): Promise<p.Browser> =>
    queueLaunch(() => p.launch(buildLaunchOptions(browser, headless, extra)));
