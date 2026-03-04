const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const d3 = require('d3');
const vm = require('vm');

describe('SVG Text Wrapping Logic', () => {
    let window;
    let document;
    let wrapFunction;
    let svg;

    beforeAll(() => {
        // Read the HTML file
        const htmlPath = path.resolve(__dirname, '../Mindmap.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Parse HTML to extract the script content
        const domForScript = new JSDOM(htmlContent);
        const scripts = Array.from(domForScript.window.document.querySelectorAll('script'));
        const mainScript = scripts.find(s => s.textContent.includes('function wrap(texts, maxWidth)'));

        if (!mainScript) {
            throw new Error('Script containing wrap function not found in Mindmap.html');
        }

        // Parse the whole script to extract the function safely without brittle regex matching
        const dom = new JSDOM(`<!DOCTYPE html><html><body><svg id="test-svg"></svg></body></html>`, { runScripts: "dangerously" });
        window = dom.window;
        document = window.document;

        // Mock getComputedTextLength for SVG elements
        window.SVGElement.prototype.getComputedTextLength = function() {
            // Simple mock: assume each character is 10px wide
            return (this.textContent || '').length * 10;
        };

        // We run the mainScript text to register the functions
        // Extract script element text and run it via vm with window context
        const sandbox = {
            window: window,
            document: document,
            d3: d3,
            console: { ...console, error: () => {} }, // suppress expected console.errors from window.onload fail
            setTimeout: setTimeout,
            parseFloat: parseFloat,
            Math: Math
        };

        vm.createContext(sandbox);

        // We run the mainScript text to register the functions
        // To avoid window.onload execution failures due to missing DOM structure expected by the original script,
        // we'll append a dummy container if needed, or simply extract the function
        const containerHtml = `<div id="tree-svg-container"><svg id="tree-svg"></svg></div>`;
        document.body.innerHTML += containerHtml;

        try {
            vm.runInContext(mainScript.textContent, sandbox);
            // After running, `wrap` should be defined in the sandbox
            wrapFunction = sandbox.wrap;
        } catch (err) {
            // If it fails on window.onload or something else, we still might have wrap defined
            wrapFunction = sandbox.wrap;
        }

        if (!wrapFunction) {
            throw new Error('Could not extract wrap function from script.');
        }
    });

    beforeEach(() => {
        // Clear SVG before each test
        const svgElement = document.getElementById('test-svg');
        svgElement.innerHTML = '';
        svg = d3.select(document.getElementById('test-svg'));
    });

    it('should not wrap text if it is within maxWidth', () => {
        // Mock text length: "Short" -> 5 chars -> 50px
        const textElement = svg.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('dy', '0.35')
            .attr('text-anchor', 'start')
            .text('Short');

        // Apply wrap with maxWidth 100
        wrapFunction(svg.selectAll('text'), 100);

        const tspans = textElement.selectAll('tspan');
        expect(tspans.size()).toBe(1);
        expect(tspans.text()).toBe('Short');
        expect(tspans.attr('dy')).toBe('0.35em');
    });

    it('should wrap text if it exceeds maxWidth', () => {
        const textElement = svg.append('text')
            .attr('x', 10)
            .attr('y', 20)
            .attr('dy', '0')
            .attr('text-anchor', 'middle')
            .text('This is a very long text');

        // Apply wrap with maxWidth 80
        wrapFunction(svg.selectAll('text'), 80);

        const tspans = textElement.selectAll('tspan');
        expect(tspans.size()).toBeGreaterThan(1);

        const tspanNodes = tspans.nodes();

        // Check first line
        expect(d3.select(tspanNodes[0]).text()).toBe('This is');
        expect(d3.select(tspanNodes[0]).attr('x')).toBe('10');
        expect(d3.select(tspanNodes[0]).attr('y')).toBe('20');
        expect(d3.select(tspanNodes[0]).attr('dy')).toBe('0em');

        // Check second line
        expect(d3.select(tspanNodes[1]).text()).toBe('a very');
        expect(d3.select(tspanNodes[1]).attr('x')).toBe('10');
        expect(d3.select(tspanNodes[1]).attr('y')).toBe('20');
        expect(d3.select(tspanNodes[1]).attr('dy')).toBe('1.1em');

        // Check third line
        expect(d3.select(tspanNodes[2]).text()).toBe('long');
        expect(d3.select(tspanNodes[2]).attr('x')).toBe('10');
        expect(d3.select(tspanNodes[2]).attr('y')).toBe('20');
        expect(d3.select(tspanNodes[2]).attr('dy')).toBe('2.2em');

        // Check fourth line
        expect(d3.select(tspanNodes[3]).text()).toBe('text');
        expect(d3.select(tspanNodes[3]).attr('x')).toBe('10');
        expect(d3.select(tspanNodes[3]).attr('y')).toBe('20');
        expect(d3.select(tspanNodes[3]).attr('dy')).toBe('3.3000000000000003em'); // 3 * 1.1 = 3.3
    });

    it('should handle single long word exceeding maxWidth without splitting the word', () => {
        const textElement = svg.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('dy', '0')
            .text('Supercalifragilisticexpialidocious');

        // Apply wrap with maxWidth 50 (word is 340px)
        wrapFunction(svg.selectAll('text'), 50);

        const tspans = textElement.selectAll('tspan');
        expect(tspans.size()).toBe(1);
        expect(tspans.text()).toBe('Supercalifragilisticexpialidocious');
    });

    it('should handle multiple text elements independently', () => {
        svg.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('dy', '0')
            .attr('id', 'text1')
            .text('Short');

        svg.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('dy', '0')
            .attr('id', 'text2')
            .text('Very long text here'); // 19 chars

        wrapFunction(svg.selectAll('text'), 100);

        const text1Tspans = d3.select(document.getElementById('text1')).selectAll('tspan');
        expect(text1Tspans.size()).toBe(1);
        expect(text1Tspans.text()).toBe('Short');

        const text2Tspans = d3.select(document.getElementById('text2')).selectAll('tspan');
        expect(text2Tspans.size()).toBeGreaterThan(1);

        const nodes = text2Tspans.nodes();
        expect(d3.select(nodes[0]).text()).toBe('Very long');
        expect(d3.select(nodes[1]).text()).toBe('text here');
    });
});
