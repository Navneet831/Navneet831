const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('parseGoogleSheetData', () => {
    let context;

    beforeAll(() => {
        // Read the index.html file
        const htmlPath = path.resolve(__dirname, '../OneDrive/Desktop/Script/index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Extract the content of the <script> block containing the logic
        // We look for the script block that contains window.app.parseGoogleSheetData
        const scriptMatch = htmlContent.match(/<script[^>]*>([\s\S]*?)<\/script>/g);

        let logicScript = '';
        for (const scriptTag of scriptMatch) {
            if (scriptTag.includes('window.app.parseGoogleSheetData = function')) {
                logicScript = scriptTag.replace(/<script[^>]*>|<\/script>/g, '');
                break;
            }
        }

        if (!logicScript) {
            throw new Error("Could not find script block containing window.app.parseGoogleSheetData");
        }

        // Create a fake DOM environment using vm context
        context = {
            window: {
                app: {},
                innerWidth: 1024,
                innerHeight: 768,
                addEventListener: jest.fn(),
                location: { pathname: '/' }
            },
            document: {
                getElementById: jest.fn().mockReturnValue({
                    innerText: '',
                    remove: jest.fn(),
                    innerHTML: '',
                    style: {},
                    classList: {
                        add: jest.fn(),
                        remove: jest.fn(),
                        contains: jest.fn()
                    },
                    querySelector: jest.fn(),
                    querySelectorAll: jest.fn().mockReturnValue([])
                }),
                querySelectorAll: jest.fn().mockReturnValue([]),
                getElementsByTagName: jest.fn().mockReturnValue([{
                    parentNode: {
                        insertBefore: jest.fn()
                    }
                }]),
                createElement: jest.fn().mockReturnValue({}),
            },
            setTimeout: setTimeout,
            clearTimeout: clearTimeout,
            setInterval: setInterval,
            clearInterval: clearInterval,
            console: {
                log: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            },
            fetch: jest.fn()
        };

        // window.app usually exists in the real environment as window.app or just app
        context.window.app = context.window.app || {};

        vm.createContext(context);

        // Mock a few things the script expects at global scope
        vm.runInContext(`
            var window = this.window;
            var document = this.document;
            var setTimeout = this.setTimeout;
            var clearTimeout = this.clearTimeout;
            var setInterval = this.setInterval;
            var clearInterval = this.clearInterval;
            var console = this.console;
            var fetch = this.fetch;
        `, context);

        vm.runInContext(logicScript, context);
    });

    test('Returns [] on completely invalid JSON', () => {
        const text = "/*O_o*/\ngoogle.visualization.Query.setResponse(invalid json here);";
        const result = context.window.app.parseGoogleSheetData(text);
        expect(result).toEqual([]);
        expect(context.console.error).toHaveBeenCalled();
    });

    test('Returns [] when the JSON is successfully parsed but does not have table property', () => {
        const text = "/*O_o*/\ngoogle.visualization.Query.setResponse({\"version\":\"0.6\",\"reqId\":\"0\",\"status\":\"ok\"});";
        const result = context.window.app.parseGoogleSheetData(text);
        expect(result).toEqual([]);
    });

    test('Returns [] when the JSON is successfully parsed but does not have table.rows property', () => {
        const text = "/*O_o*/\ngoogle.visualization.Query.setResponse({\"version\":\"0.6\",\"reqId\":\"0\",\"status\":\"ok\",\"table\":{\"cols\":[{\"id\":\"A\",\"label\":\"\",\"type\":\"string\"}]}});";
        const result = context.window.app.parseGoogleSheetData(text);
        expect(result).toEqual([]);
    });

    test('Returns rows when a valid Google Sheet visualization JSON string is provided', () => {
        const validJsonStr = "/*O_o*/\ngoogle.visualization.Query.setResponse({\"version\":\"0.6\",\"reqId\":\"0\",\"status\":\"ok\",\"sig\":\"2037951010\",\"table\":{\"cols\":[{\"id\":\"A\",\"label\":\"\",\"type\":\"string\"}],\"rows\":[{\"c\":[{\"v\":\"data\"}]}]}});";
        const result = context.window.app.parseGoogleSheetData(validJsonStr);
        expect(result).toEqual([ { c: [ { v: 'data' } ] } ]);
    });

    test('Handles an empty string', () => {
        const text = "";
        const result = context.window.app.parseGoogleSheetData(text);
        expect(result).toEqual([]);
        expect(context.console.error).toHaveBeenCalled();
    });
});
