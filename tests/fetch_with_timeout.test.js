const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Read the HTML file
const htmlPath = path.join(__dirname, '../OneDrive/Desktop/Script/index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// Extract the script tags
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
let match;
let scriptContent = '';

while ((match = scriptRegex.exec(htmlContent)) !== null) {
    if (match[1].includes('window.app.fetchWithTimeout')) {
        scriptContent += match[1];
    }
}

test('window.app.fetchWithTimeout', async (t) => {
    await t.test('resolves with response text on success', async () => {
        // Mock fetch and setTimeout
        const mockFetch = async (url) => {
            return {
                ok: true,
                status: 200,
                text: async () => 'mock response text'
            };
        };

        let clearTimeoutCalled = false;

        const sandbox = {
            window: {
                app: {
                    GOOGLE_SHEET_TIMEOUT_MS: 8000
                },
                addEventListener: () => {}
            },
            setTimeout: setTimeout,
            clearTimeout: (id) => {
                clearTimeoutCalled = true;
                clearTimeout(id);
            },
            fetch: mockFetch,
            console: console,
            document: {
                getElementById: () => null,
                getElementsByTagName: () => [{ parentNode: { insertBefore: () => {} } }],
                createElement: () => ({})
            }
        };

        vm.createContext(sandbox);
        vm.runInContext(scriptContent, sandbox);

        const result = await sandbox.window.app.fetchWithTimeout('https://example.com');
        assert.strictEqual(result, 'mock response text');
        assert.strictEqual(clearTimeoutCalled, true, 'clearTimeout should be called on success');
    });

    await t.test('rejects with HTTP error if response is not ok', async () => {
        const mockFetch = async (url) => {
            return {
                ok: false,
                status: 404,
                text: async () => 'Not Found'
            };
        };

        let clearTimeoutCalled = false;

        const sandbox = {
            window: {
                app: {
                    GOOGLE_SHEET_TIMEOUT_MS: 8000
                },
                addEventListener: () => {}
            },
            setTimeout: setTimeout,
            clearTimeout: (id) => {
                clearTimeoutCalled = true;
                clearTimeout(id);
            },
            fetch: mockFetch,
            console: console,
            document: {
                getElementById: () => null,
                getElementsByTagName: () => [{ parentNode: { insertBefore: () => {} } }],
                createElement: () => ({})
            }
        };

        vm.createContext(sandbox);
        vm.runInContext(scriptContent, sandbox);

        await assert.rejects(
            sandbox.window.app.fetchWithTimeout('https://example.com'),
            (err) => {
                assert.strictEqual(err.message, 'HTTP error! status: 404');
                return true;
            }
        );
        assert.strictEqual(clearTimeoutCalled, true, 'clearTimeout should be called on error');
    });

    await t.test('rejects with network error if fetch fails', async () => {
        const mockFetch = async (url) => {
            throw new Error('Network request failed');
        };

        let clearTimeoutCalled = false;

        const sandbox = {
            window: {
                app: {
                    GOOGLE_SHEET_TIMEOUT_MS: 8000
                },
                addEventListener: () => {}
            },
            setTimeout: setTimeout,
            clearTimeout: (id) => {
                clearTimeoutCalled = true;
                clearTimeout(id);
            },
            fetch: mockFetch,
            console: console,
            document: {
                getElementById: () => null,
                getElementsByTagName: () => [{ parentNode: { insertBefore: () => {} } }],
                createElement: () => ({})
            }
        };

        vm.createContext(sandbox);
        vm.runInContext(scriptContent, sandbox);

        await assert.rejects(
            sandbox.window.app.fetchWithTimeout('https://example.com'),
            (err) => {
                assert.strictEqual(err.message, 'Network request failed');
                return true;
            }
        );
        assert.strictEqual(clearTimeoutCalled, true, 'clearTimeout should be called on network error');
    });

    await t.test('rejects with timeout error if fetch takes too long', async () => {
        const mockFetch = async (url) => {
            return new Promise((resolve) => {
                // Do not resolve to simulate timeout
            });
        };

        const sandbox = {
            window: {
                app: {
                    GOOGLE_SHEET_TIMEOUT_MS: 50 // Short timeout for testing
                },
                addEventListener: () => {}
            },
            setTimeout: setTimeout,
            clearTimeout: clearTimeout,
            fetch: mockFetch,
            console: console,
            document: {
                getElementById: () => null,
                getElementsByTagName: () => [{ parentNode: { insertBefore: () => {} } }],
                createElement: () => ({})
            }
        };

        vm.createContext(sandbox);
        vm.runInContext(scriptContent, sandbox);

        await assert.rejects(
            sandbox.window.app.fetchWithTimeout('https://example.com'),
            (err) => {
                assert.strictEqual(err.message, 'Fetch Timeout');
                return true;
            }
        );
    });
});
