const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('OneDrive/Desktop/Script/index.html', 'utf-8');

const dom = new JSDOM(html, { runScripts: "dangerously" });
const window = dom.window;
const document = window.document;

// Mock window.app.trackEvent to avoid mixpanel error
window.app.trackEvent = () => {};

// Wait for scripts to execute
setTimeout(() => {
    // Override trackEvent again just in case initialization resets it
    window.app.trackEvent = () => {};

    // Inject some fake FAQ data
    window.app.faqData = Array.from({ length: 100 }).map((_, i) => ({
        question: `Question ${i}`,
        answer: `Answer ${i}`,
        link: ""
    }));
    window.app.renderFAQ();

    const buttons = document.querySelectorAll('.accordion-item button');

    // Warm up
    for(let i = 0; i < 10; i++) {
        window.app.toggleAccordion(buttons[i % buttons.length]);
    }

    const start = process.hrtime.bigint();
    for (let i = 0; i < 1000; i++) {
        window.app.toggleAccordion(buttons[i % buttons.length]);
    }
    const end = process.hrtime.bigint();

    console.log(`Execution time: ${Number(end - start) / 1e6} ms`);
}, 500);
