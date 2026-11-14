import { expect } from 'chai';
import { buildLaunchOptions, queueLaunch } from '../../src/puppet/launcher.js';

describe('Launcher', () => {
    it('selects Firefox with the `browser` option, not `channel`', () => {
        const options = buildLaunchOptions('firefox', true);

        expect(options.browser).to.equal('firefox');
        expect(options).to.not.have.property('channel');
    });

    it('does not pass Chrome-only flags to Firefox', () => {
        const options = buildLaunchOptions('firefox', true);

        expect(options.args).to.deep.equal([]);
    });

    it('passes the headless flag through', () => {
        expect(buildLaunchOptions('firefox', true).headless).to.equal(true);
        expect(buildLaunchOptions('chrome', false).headless).to.equal(false);
    });

    it('uses Chrome flags for Chrome, maximized only when headed', () => {
        const headless = buildLaunchOptions('chrome', true);
        const headed = buildLaunchOptions('chrome', false);

        expect(headless.browser).to.equal('chrome');
        expect(headless.args).to.include('--no-sandbox');
        expect(headless.args).to.not.include('--start-maximized');
        expect(headed.args).to.include('--start-maximized');
    });

    it('lets user options override defaults and appends user args', () => {
        const options = buildLaunchOptions('firefox', true, {
            executablePath: '/opt/firefox/firefox',
            acceptInsecureCerts: false,
            args: ['--width=1280'],
        });

        expect(options.executablePath).to.equal('/opt/firefox/firefox');
        expect(options.acceptInsecureCerts).to.equal(false);
        expect(options.args).to.deep.equal(['--width=1280']);
        expect(options.browser).to.equal('firefox');
    });

    describe('queueLaunch', () => {
        const deferred = () => {
            let resolve!: (value: string) => void;
            let reject!: (reason: Error) => void;
            const promise = new Promise<string>((res, rej) => {
                resolve = res;
                reject = rej;
            });
            return { promise, resolve, reject };
        };
        const tick = () => new Promise(resolve => setImmediate(resolve));

        it('starts a launch only once the previous one is over', async () => {
            const events: string[] = [];
            const chrome = deferred();

            const first = queueLaunch(() => {
                events.push('chrome started');
                return chrome.promise;
            });
            const second = queueLaunch(async () => {
                events.push('firefox started');
                return 'firefox';
            });
            await tick();
            expect(events).to.deep.equal(['chrome started']);

            chrome.resolve('chrome');
            expect(await first).to.equal('chrome');
            expect(await second).to.equal('firefox');
            expect(events).to.deep.equal(['chrome started', 'firefox started']);
        });

        it('goes on after a failed launch, and reports each outcome to its caller', async () => {
            const chrome = deferred();
            const first = queueLaunch(() => chrome.promise);
            const second = queueLaunch(async () => 'firefox');

            chrome.reject(new Error('Could not find Chrome'));

            let caught: unknown;
            try {
                await first;
            } catch (e) {
                caught = e;
            }
            expect((caught as Error).message).to.equal('Could not find Chrome');
            expect(await second).to.equal('firefox');
        });
    });
});
