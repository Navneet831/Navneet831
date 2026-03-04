const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Path to the index.html file containing the logic
const htmlFilePath = path.join(__dirname, '../OneDrive/Desktop/Script/index.html');

// Read the HTML content
const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');

// Extract the script blocks
const scriptBlocks = htmlContent.match(/<script>([\s\S]*?)<\/script>/g);

if (!scriptBlocks) {
    console.error("No script blocks found in index.html");
    process.exit(1);
}

// We need to set up a mock browser environment
const appObj = {};
const sandbox = {
    tailwind: {},
    window: { app: appObj },
    app: appObj,
    document: {
        getElementById: () => null,
        querySelectorAll: () => [],
        createElement: () => ({}),
    },
    console: {
        log: console.log,
        error: console.error,
        warn: console.warn,
    },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    process: process,
    fetch: () => Promise.resolve(),
    d3: {
        select: () => ({ append: () => ({ attr: () => ({ attr: () => ({}) }) }), call: () => ({}) }),
        zoom: () => ({ scaleExtent: () => ({ on: () => ({}) }), translateTo: () => ({}) }),
        forceSimulation: () => ({ force: () => ({ force: () => ({ force: () => ({ on: () => ({}) }) }) }) }),
        forceLink: () => ({ id: () => ({ distance: () => ({ strength: () => ({}) }) }) }),
        forceManyBody: () => ({ strength: () => ({}) }),
        forceCenter: () => ({}),
        hierarchy: () => ({ sum: () => ({ descendants: () => [], links: () => [] }) }),
        drag: () => ({ on: () => ({ on: () => ({ on: () => ({}) }) }) })
    }
};

// Create a context for the VM
vm.createContext(sandbox);

// Evaluate each script block
const context = vm.createContext(sandbox);

// Just parse it with regex rather than trying to evaluate the whole file
// which has a lot of DOM dependencies.
const funcMatch = htmlContent.match(/window\.app\.formatDateMMYY\s*=\s*function\s*\([^)]*\)\s*\{([\s\S]*?)\n        \};/);
if (!funcMatch) {
    console.error("Could not find window.app.formatDateMMYY function definition via regex.");
    process.exit(1);
}

const funcCode = `
    const window = { app: {} };
    window.app.formatDateMMYY = function(dateString) {
        ${funcMatch[1]}
    };
    window.app.formatDateMMYY;
`;

let extractedFormatDateMMYY;
try {
    extractedFormatDateMMYY = vm.runInNewContext(funcCode, {});
} catch(e) {
    console.error("Error evaluating extracted function", e);
    process.exit(1);
}

// Extract the target function
const formatDateMMYY = extractedFormatDateMMYY;

if (!formatDateMMYY || typeof formatDateMMYY !== 'function') {
    console.error("formatDateMMYY not found or is not a function after extraction.");
    process.exit(1);
}

console.log("Starting tests for window.app.formatDateMMYY...\n");

let passed = 0;
let failed = 0;

function runTest(name, input, expected) {
    try {
        const result = formatDateMMYY(input);
        assert.deepStrictEqual(result, expected);
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (error) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   Input: ${JSON.stringify(input)}`);
        console.error(`   Expected: ${JSON.stringify(expected)}`);
        console.error(`   Actual: ${JSON.stringify(formatDateMMYY(input))}`);
        failed++;
    }
}

// --- Test Cases ---

// 1. Falsy and empty values
runTest('Null input returns empty string', null, '');
runTest('Undefined input returns empty string', undefined, '');
runTest('Empty string returns empty string', '', '');

// 2. Google Sheets Date format strings
// Google Sheets' Date(Y, M, D) uses 0-indexed months, so Date(2023, 0, 1) is Jan 2023.
runTest('Google Sheet Date format (January)', 'Date(2023, 0, 1)', '01/23');
runTest('Google Sheet Date format (December)', 'Date(2023, 11, 15)', '12/23');
runTest('Google Sheet Date format (Missing Day)', 'Date(2023, 5)', '06/23');
// Testing the parts logic exactly from code: parts length >= 2
runTest('Google Sheet Date format (Missing Month and Day)', 'Date(2023)', 'Date(2023)'); // Original string

// 3. Standard date formats
runTest('ISO Date string (YYYY-MM-DD)', '2024-03-01', '03/24');
runTest('Standard Date string (MMM DD, YYYY)', 'Jan 15, 2022', '01/22');
runTest('Date object', new Date(2025, 6, 4), '07/25'); // July 2025

// 4. Invalid dates and edge cases
runTest('Invalid date string returns original string', 'invalid-date', 'invalid-date');
runTest('Plain string returns original string', 'Present', 'Present');
runTest('Number returns parsed date if valid (e.g. timestamp)', 1709571600000, '03/24'); // timestamp for Mar 4 2024
// NaN is falsy, so !dateString is true and it returns ''
runTest('NaN returns empty string', NaN, '');
runTest('Object returns original object', {}, {});
runTest('Empty array returns original array', [], []);

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);

if (failed > 0) {
    process.exit(1);
}
