import { expect } from 'chai';
import { buildLaunchOptions } from '../../src/puppet/launcher';

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
});
