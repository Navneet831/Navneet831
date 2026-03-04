const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const test = require('node:test');
const assert = require('node:assert');

function setupDOM() {
    const htmlPath = path.join(__dirname, '../OneDrive/Desktop/Script/index.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

    const dom = new JSDOM(htmlContent, { url: "http://localhost/" });
    const document = dom.window.document;

    // Remove external scripts
    const scripts = Array.from(document.querySelectorAll('script'));
    scripts.forEach(script => {
        if (script.src) {
            script.remove();
        }
    });

    // Remove the tailwind config script to prevent reference error
    const inlineScripts = Array.from(document.querySelectorAll('script:not([src])'));
    inlineScripts.forEach(script => {
        if (script.textContent.includes('tailwind.config')) {
            script.textContent = 'var tailwind = {config: {}};';
        }
    });

    const cleanHtml = dom.serialize();
    const testDom = new JSDOM(cleanHtml, {
        runScripts: "dangerously",
        url: "http://localhost/",
        beforeParse(window) {
            window.fetch = () => new Promise(() => {});
            window.setInterval = () => 1;
            window.setTimeout = (fn) => { if (fn) { try { fn() } catch (e) {} }; return 1; };
            window.clearTimeout = () => {};
            window.clearInterval = () => {};

            window.d3 = {
                select: () => ({ append: () => ({ attr: () => ({ append: () => ({ attr: () => ({ call: () => ({}), on: () => ({ force: () => ({ force: () => ({ on: () => ({}) }) }) }) }) }) }) }) }),
                zoom: () => ({ scaleExtent: () => ({ on: () => ({}) }), translateTo: () => ({}) }),
                forceSimulation: () => ({ force: () => ({ force: () => ({ force: () => ({ on: () => ({ nodes: () => ({ force: () => ({ links: () => ({ alpha: () => ({ restart: () => ({}) }) }) }) }) }) }) }) }) }),
                forceLink: () => ({ id: () => ({ distance: () => ({ strength: () => ({}) }) }) }),
                forceManyBody: () => ({ strength: () => ({}) }),
                forceCenter: () => ({}),
                hierarchy: () => ({ sum: () => ({ descendants: () => [], links: () => [] }) }),
                drag: () => ({ on: () => ({ on: () => ({ on: () => ({}) }) }) })
            };
        }
    });

    const window = testDom.window;
    window.onload = null;
    if (window.app) {
        window.app.trackEvent = () => {};
    }

    return { window, document: window.document };
}

// ------------------------------------------
// TEST CASES
// ------------------------------------------

test('window.app.renderCerts tests', async (t) => {

    await t.test('returns undefined and doesn\'t throw when #certList is missing', () => {
        const { window, document } = setupDOM();
        const list = document.getElementById('certList');
        if (list) list.remove(); // Remove certList

        assert.doesNotThrow(() => {
            const result = window.app.renderCerts();
            assert.strictEqual(result, undefined);
        });
    });

    await t.test('Filtering: ALL renders all items', () => {
        const { window, document } = setupDOM();
        const testData = [
            { category: 'C', t: 'Cert 1', rel: 1, y: '2024-01-01', l: '#' },
            { category: 'P', t: 'Project 1', rel: 2, y: '2023-01-01', l: '#' }
        ];
        window.app.certs = testData;
        window.app.currentFilter = 'ALL';

        window.app.renderCerts();

        const listHTML = document.getElementById('certList').innerHTML;
        assert.ok(listHTML.includes('Cert 1'), "Should contain Cert 1");
        assert.ok(listHTML.includes('Project 1'), "Should contain Project 1");
    });

    await t.test('Filtering: by specific category', () => {
        const { window, document } = setupDOM();
        const testData = [
            { category: 'C', t: 'Cert 1', rel: 1, y: '2024-01-01', l: '#' },
            { category: 'P', t: 'Project 1', rel: 2, y: '2023-01-01', l: '#' }
        ];
        window.app.certs = testData;
        window.app.currentFilter = 'C'; // Filter by C

        window.app.renderCerts();

        const listHTML = document.getElementById('certList').innerHTML;
        assert.ok(listHTML.includes('Cert 1'), "Should contain Cert 1");
        assert.strictEqual(listHTML.includes('Project 1'), false, "Should not contain Project 1");
    });

    await t.test('Sorting: Relevance (isSortRel = true) orders ascending by rel and defaults to 99', () => {
        const { window, document } = setupDOM();
        const testData = [
            { category: 'C', t: 'Last (No Rel)', y: '2024-01-01', l: '#' }, // should default to 99
            { category: 'C', t: 'Second (Rel 5)', rel: 5, y: '2023-01-01', l: '#' },
            { category: 'C', t: 'First (Rel 1)', rel: 1, y: '2022-01-01', l: '#' }
        ];
        window.app.certs = testData;
        window.app.currentFilter = 'ALL';
        window.app.isSortRel = true;

        window.app.renderCerts();

        const sortBtn = document.getElementById('sortBtn');
        assert.strictEqual(sortBtn.innerText, 'Sort: Relevance');

        const renderedText = document.getElementById('certList').textContent;
        const firstIndex = renderedText.indexOf('First');
        const secondIndex = renderedText.indexOf('Second');
        const lastIndex = renderedText.indexOf('Last');

        assert.ok(firstIndex !== -1 && secondIndex !== -1 && lastIndex !== -1);
        assert.ok(firstIndex < secondIndex, 'First should be before Second');
        assert.ok(secondIndex < lastIndex, 'Second should be before Last');
    });

    await t.test('Sorting: Date (isSortRel = false) orders descending by timestamp', () => {
        const { window, document } = setupDOM();
        const testData = [
            { category: 'C', t: 'Middle Date', y: '2023-01-01', l: '#' },
            { category: 'C', t: 'Newest Date', y: '2024-01-01', l: '#' },
            { category: 'C', t: 'Oldest Date', y: '2022-01-01', l: '#' }
        ];
        window.app.certs = testData;
        window.app.currentFilter = 'ALL';
        window.app.isSortRel = false;

        window.app.renderCerts();

        const sortBtn = document.getElementById('sortBtn');
        assert.strictEqual(sortBtn.innerText, 'Sort: Latest');

        const renderedText = document.getElementById('certList').textContent;
        const newestIndex = renderedText.indexOf('Newest Date');
        const middleIndex = renderedText.indexOf('Middle Date');
        const oldestIndex = renderedText.indexOf('Oldest Date');

        assert.ok(newestIndex !== -1 && middleIndex !== -1 && oldestIndex !== -1);
        assert.ok(newestIndex < middleIndex, 'Newest should be before Middle');
        assert.ok(middleIndex < oldestIndex, 'Middle should be before Oldest');
    });

    await t.test('Link rendering: \'http\' prefix wraps in <a> tag, others in <div>', () => {
        const { window, document } = setupDOM();
        const testData = [
            { category: 'C', t: 'With Link', y: '2024-01-01', l: 'http://example.com' },
            { category: 'C', t: 'Without Link', y: '2023-01-01', l: '#' },
            { category: 'C', t: 'Empty Link', y: '2023-01-01', l: '' }
        ];
        window.app.certs = testData;
        window.app.currentFilter = 'ALL';

        window.app.renderCerts();

        const listHTML = document.getElementById('certList').innerHTML;

        // Item with link
        assert.ok(listHTML.includes('<a href="http://example.com"'), "Should contain an anchor tag for With Link");
        assert.ok(listHTML.includes('With Link'), "Should contain With Link text");

        // Items without link
        assert.ok(!listHTML.includes('<a href="#"'), "Should not contain anchor tag for #");
        assert.ok(listHTML.includes('<div class="block"'), "Should use div for empty or # links");
        assert.ok(listHTML.includes('Without Link'), "Should contain Without Link text");
        assert.ok(listHTML.includes('Empty Link'), "Should contain Empty Link text");
    });
});
