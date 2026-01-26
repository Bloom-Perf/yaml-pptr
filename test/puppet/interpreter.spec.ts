import { expect } from 'chai';
import { evalScenario } from '../../src/puppet/interpreter';
import { ActionType, Scenario, Action } from '../../src/core/model';

describe('Interpreter', () => {
    // Track all method calls for assertions
    interface CallLog {
        method: string;
        args: any[];
    }

    const createMockPage = (calls: CallLog[] = []) => ({
        goto: async (url: string, options?: any) => {
            calls.push({ method: 'goto', args: [url, options] });
        },
        click: async (selector: string, options?: any) => {
            calls.push({ method: 'click', args: [selector, options] });
        },
        type: async (selector: string, text: string, options?: any) => {
            calls.push({ method: 'type', args: [selector, text, options] });
        },
        waitForSelector: async (selector: string, options?: any) => {
            calls.push({ method: 'waitForSelector', args: [selector, options] });
        },
        evaluate: async (fn: any, ...args: any[]) => {
            calls.push({ method: 'evaluate', args: [fn, ...args] });
        },
        screenshot: async (options?: any) => {
            calls.push({ method: 'screenshot', args: [options] });
        },
        setViewport: async (viewport: any) => {
            calls.push({ method: 'setViewport', args: [viewport] });
        },
        close: async () => {
            calls.push({ method: 'close', args: [] });
        },
    });

    const createMockBrowser = (calls: CallLog[] = []) => {
        const page = createMockPage(calls);
        return {
            newPage: async () => {
                calls.push({ method: 'newPage', args: [] });
                return page;
            },
        } as any;
    };

    const createScenario = (actions: Action[], overrides: Partial<Scenario> = {}): Scenario => ({
        name: 'Test Scenario',
        browser: 'chrome',
        run: { initialDelaySeconds: 0 },
        workers: 1,
        iterations: 1,
        actions,
        ...overrides,
    });

    describe('Navigate action', () => {
        it('navigates to a direct URL', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.Navigate, location: { url: 'http://example.com' } },
            ]);

            await evalScenario(browser, scenario);

            const gotoCalls = calls.filter(c => c.method === 'goto');
            expect(gotoCalls).to.have.lengthOf(1);
            expect(gotoCalls[0].args[0]).to.equal('http://example.com');
        });

        it('navigates to indexed URL based on worker index', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                {
                    actionType: ActionType.Navigate,
                    location: { workerIndex: ['http://url0.com', 'http://url1.com', 'http://url2.com'] },
                },
            ], { workers: 3 });

            await evalScenario(browser, scenario);

            const gotoCalls = calls.filter(c => c.method === 'goto');
            expect(gotoCalls).to.have.lengthOf(3);
            expect(gotoCalls.map(c => c.args[0])).to.include.members([
                'http://url0.com',
                'http://url1.com',
                'http://url2.com',
            ]);
        });
    });

    describe('Goto action', () => {
        it('executes goto with URL', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.Goto, url: 'http://goto.com' },
            ]);

            await evalScenario(browser, scenario);

            const gotoCalls = calls.filter(c => c.method === 'goto');
            expect(gotoCalls).to.have.lengthOf(1);
            expect(gotoCalls[0].args[0]).to.equal('http://goto.com');
        });

        it('executes goto with options', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                {
                    actionType: ActionType.Goto,
                    url: 'http://goto.com',
                    options: { timeout: 5000, waitUntil: 'networkidle0', referer: 'http://ref.com' },
                },
            ]);

            await evalScenario(browser, scenario);

            const gotoCalls = calls.filter(c => c.method === 'goto');
            expect(gotoCalls[0].args[1]).to.deep.equal({
                timeout: 5000,
                waitUntil: 'networkidle0',
                referer: 'http://ref.com',
            });
        });
    });

    describe('Click action', () => {
        it('clicks on selector', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.Click, selector: '#button' },
            ]);

            await evalScenario(browser, scenario);

            const clickCalls = calls.filter(c => c.method === 'click');
            expect(clickCalls).to.have.lengthOf(1);
            expect(clickCalls[0].args[0]).to.equal('#button');
        });

        it('clicks with options', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                {
                    actionType: ActionType.Click,
                    selector: '#button',
                    options: { button: 'right', clickCount: 2, delay: 100 },
                },
            ]);

            await evalScenario(browser, scenario);

            const clickCalls = calls.filter(c => c.method === 'click');
            expect(clickCalls[0].args[1]).to.deep.equal({
                button: 'right',
                clickCount: 2,
                delay: 100,
            });
        });
    });

    describe('Type action', () => {
        it('types text into selector', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.Type, selector: '#input', text: 'hello world' },
            ]);

            await evalScenario(browser, scenario);

            const typeCalls = calls.filter(c => c.method === 'type');
            expect(typeCalls).to.have.lengthOf(1);
            expect(typeCalls[0].args[0]).to.equal('#input');
            expect(typeCalls[0].args[1]).to.equal('hello world');
        });

        it('types with delay option', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                {
                    actionType: ActionType.Type,
                    selector: '#input',
                    text: 'test',
                    options: { delay: 50 },
                },
            ]);

            await evalScenario(browser, scenario);

            const typeCalls = calls.filter(c => c.method === 'type');
            expect(typeCalls[0].args[2]).to.deep.equal({ delay: 50 });
        });
    });

    describe('WaitForSelector action', () => {
        it('waits for selector', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.WaitForSelector, selector: '.loaded' },
            ]);

            await evalScenario(browser, scenario);

            const waitCalls = calls.filter(c => c.method === 'waitForSelector');
            expect(waitCalls).to.have.lengthOf(1);
            expect(waitCalls[0].args[0]).to.equal('.loaded');
        });

        it('waits for selector with options', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                {
                    actionType: ActionType.WaitForSelector,
                    selector: '.loaded',
                    options: { visible: true, timeout: 3000 },
                },
            ]);

            await evalScenario(browser, scenario);

            const waitCalls = calls.filter(c => c.method === 'waitForSelector');
            expect(waitCalls[0].args[1]).to.deep.equal({ visible: true, timeout: 3000 });
        });
    });

    describe('Wait action', () => {
        it('waits for specified milliseconds', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.Wait, milliseconds: 1000 },
            ]);

            await evalScenario(browser, scenario);

            const evalCalls = calls.filter(c => c.method === 'evaluate');
            expect(evalCalls).to.have.lengthOf(1);
            expect(evalCalls[0].args[1]).to.equal(1000);
        });
    });

    describe('WaitForTimeout action', () => {
        it('waits for timeout', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.WaitForTimeout, timeout: 2000 },
            ]);

            await evalScenario(browser, scenario);

            const evalCalls = calls.filter(c => c.method === 'evaluate');
            expect(evalCalls).to.have.lengthOf(1);
            expect(evalCalls[0].args[1]).to.equal(2000);
        });
    });

    describe('Screenshot action', () => {
        it('takes screenshot with path', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.Screenshot, path: 'screenshot.png' },
            ]);

            await evalScenario(browser, scenario);

            const screenshotCalls = calls.filter(c => c.method === 'screenshot');
            expect(screenshotCalls).to.have.lengthOf(1);
            expect(screenshotCalls[0].args[0].path).to.equal('screenshot.png');
        });

        it('takes screenshot with full options', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                {
                    actionType: ActionType.Screenshot,
                    path: 'screenshot.jpg',
                    options: {
                        type: 'jpeg',
                        quality: 80,
                        fullPage: true,
                        omitBackground: true,
                    },
                },
            ]);

            await evalScenario(browser, scenario);

            const screenshotCalls = calls.filter(c => c.method === 'screenshot');
            expect(screenshotCalls[0].args[0]).to.deep.equal({
                path: 'screenshot.jpg',
                type: 'jpeg',
                quality: 80,
                fullPage: true,
                clip: undefined,
                omitBackground: true,
                encoding: undefined,
            });
        });
    });

    describe('Evaluate action', () => {
        it('evaluates script', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.Evaluate, script: 'console.log("test")' },
            ]);

            await evalScenario(browser, scenario);

            const evalCalls = calls.filter(c => c.method === 'evaluate');
            expect(evalCalls).to.have.lengthOf(1);
            expect(evalCalls[0].args[0]).to.equal('console.log("test")');
        });
    });

    describe('SetViewport action', () => {
        it('sets viewport dimensions', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.SetViewport, width: 1920, height: 1080 },
            ]);

            await evalScenario(browser, scenario);

            const viewportCalls = calls.filter(c => c.method === 'setViewport');
            expect(viewportCalls).to.have.lengthOf(1);
            expect(viewportCalls[0].args[0]).to.deep.equal({ width: 1920, height: 1080 });
        });
    });

    describe('Close action', () => {
        it('closes the page', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.Close },
            ]);

            await evalScenario(browser, scenario);

            // Close is called twice: once by the action, once by evalScenario cleanup
            const closeCalls = calls.filter(c => c.method === 'close');
            expect(closeCalls.length).to.be.greaterThanOrEqual(1);
        });
    });

    describe('Multiple actions', () => {
        it('executes actions in sequence', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.Navigate, location: { url: 'http://example.com' } },
                { actionType: ActionType.Click, selector: '#login' },
                { actionType: ActionType.Type, selector: '#username', text: 'user' },
                { actionType: ActionType.Type, selector: '#password', text: 'pass' },
                { actionType: ActionType.Click, selector: '#submit' },
            ]);

            await evalScenario(browser, scenario);

            const actionCalls = calls.filter(c => ['goto', 'click', 'type'].includes(c.method));
            expect(actionCalls).to.have.lengthOf(5);
            expect(actionCalls[0].method).to.equal('goto');
            expect(actionCalls[1].method).to.equal('click');
            expect(actionCalls[2].method).to.equal('type');
            expect(actionCalls[3].method).to.equal('type');
            expect(actionCalls[4].method).to.equal('click');
        });
    });

    describe('Workers and iterations', () => {
        it('runs scenario with multiple workers', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.Navigate, location: { url: 'http://example.com' } },
            ], { workers: 3 });

            await evalScenario(browser, scenario);

            const newPageCalls = calls.filter(c => c.method === 'newPage');
            expect(newPageCalls).to.have.lengthOf(3);
        });

        it('runs scenario with multiple iterations', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.Navigate, location: { url: 'http://example.com' } },
            ], { iterations: 3 });

            await evalScenario(browser, scenario);

            const newPageCalls = calls.filter(c => c.method === 'newPage');
            expect(newPageCalls).to.have.lengthOf(3);
        });

        it('runs scenario with multiple workers and iterations', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.Navigate, location: { url: 'http://example.com' } },
            ], { workers: 2, iterations: 3 });

            await evalScenario(browser, scenario);

            const newPageCalls = calls.filter(c => c.method === 'newPage');
            expect(newPageCalls).to.have.lengthOf(6); // 2 workers * 3 iterations
        });
    });

    describe('Run strategies', () => {
        it('uses PARALLEL strategy with initial delay', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.Navigate, location: { url: 'http://example.com' } },
            ], { run: { initialDelaySeconds: 0 } });

            await evalScenario(browser, scenario);

            const gotoCalls = calls.filter(c => c.method === 'goto');
            expect(gotoCalls).to.have.lengthOf(1);
        });

        it('uses SEQUENTIAL strategy with delay between workers', async () => {
            const calls: CallLog[] = [];
            const browser = createMockBrowser(calls);
            const scenario = createScenario([
                { actionType: ActionType.Navigate, location: { url: 'http://example.com' } },
            ], {
                workers: 2,
                run: { delaySecondsBetweenWorkerInits: 0 },
            });

            await evalScenario(browser, scenario);

            const gotoCalls = calls.filter(c => c.method === 'goto');
            expect(gotoCalls).to.have.lengthOf(2);
        });
    });

    describe('Error handling', () => {
        it('continues other workers when one fails', async () => {
            let callCount = 0;
            const mockPage = {
                goto: async () => {
                    callCount++;
                    if (callCount === 1) {
                        throw new Error('First worker fails');
                    }
                },
                click: async () => {},
                type: async () => {},
                waitForSelector: async () => {},
                evaluate: async () => {},
                screenshot: async () => {},
                setViewport: async () => {},
                close: async () => {},
            };

            const browser = {
                newPage: async () => mockPage,
            } as any;

            const scenario = createScenario([
                { actionType: ActionType.Navigate, location: { url: 'http://example.com' } },
            ], { workers: 3 });

            // Should not throw, errors are caught per worker
            await evalScenario(browser, scenario);

            // All 3 workers attempted
            expect(callCount).to.equal(3);
        });
    });
});
