import * as p from 'puppeteer';
import { SupportedBrowser } from '../core/model';

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

export const launchBrowser = (browser: SupportedBrowser, headless: boolean, extra?: p.LaunchOptions): Promise<p.Browser> =>
    p.launch(buildLaunchOptions(browser, headless, extra));
