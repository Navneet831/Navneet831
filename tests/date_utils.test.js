const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Load index.html
const htmlPath = path.join(__dirname, '../OneDrive/Desktop/Script/index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Extract formatDateMMYY
const formatDateRegex = /window\.app\.formatDateMMYY\s*=\s*function\s*\(([^)]*)\)\s*\{([\s\S]*?)\n\s{8}\};/;
const formatDateMatch = htmlContent.match(formatDateRegex);
if (!formatDateMatch) {
    throw new Error('Could not find window.app.formatDateMMYY in index.html');
}

// Extract getTimestamp
const getTimestampRegex = /window\.app\.getTimestamp\s*=\s*function\s*\(([^)]*)\)\s*\{([\s\S]*?)\n\s{8}\};/;
const getTimestampMatch = htmlContent.match(getTimestampRegex);
if (!getTimestampMatch) {
    throw new Error('Could not find window.app.getTimestamp in index.html');
}

// Mock window.app
const context = {
    window: {
        app: {}
    }
};
vm.createContext(context);

// Define functions in VM
vm.runInContext(`
    window.app.formatDateMMYY = function(${formatDateMatch[1]}) {${formatDateMatch[2]}};
    window.app.getTimestamp = function(${getTimestampMatch[1]}) {${getTimestampMatch[2]}};
`, context);

const { formatDateMMYY, getTimestamp } = context.window.app;

// --- TESTS ---

console.log('Running tests for getTimestamp...');

// Test with null/undefined
assert.strictEqual(getTimestamp(null), 0);
assert.strictEqual(getTimestamp(undefined), 0);
assert.strictEqual(getTimestamp(''), 0);

// Test with Google Sheet Date format Date(2023,10,5) -> Nov 5, 2023
// Implementation uses 0-indexed month correctly
const gsDate = "Date(2023,10,5)";
const expectedTs = new Date(2023, 10, 5).getTime();
assert.strictEqual(getTimestamp(gsDate), expectedTs);

// Test with standard ISO string
const isoDate = "2023-11-05";
const expectedIsoTs = new Date(isoDate).getTime();
assert.strictEqual(getTimestamp(isoDate), expectedIsoTs);

// Test with invalid string - Now fixed to return 0
const invalidDate = "invalid-date";
assert.strictEqual(getTimestamp(invalidDate), 0);

console.log('getTimestamp tests passed!');

console.log('Running tests for formatDateMMYY...');

// Test with null/undefined
assert.strictEqual(formatDateMMYY(null), '');
assert.strictEqual(formatDateMMYY(undefined), '');
assert.strictEqual(formatDateMMYY(''), '');

// Test with Google Sheet Date format Date(2023,10,5) -> 11/23
assert.strictEqual(formatDateMMYY("Date(2023,10,5)"), "11/23");

// Test with standard ISO string
assert.strictEqual(formatDateMMYY("2023-11-05"), "11/23");

// Test with invalid string
assert.strictEqual(formatDateMMYY("not-a-date"), "not-a-date");

console.log('formatDateMMYY tests passed!');
