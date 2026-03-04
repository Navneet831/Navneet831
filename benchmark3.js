const fs = require('fs');

const html = fs.readFileSync('OneDrive/Desktop/Script/index.html', 'utf-8');

const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const dom = new JSDOM(html);
const window = dom.window;
const document = window.document;

// Mock window.app
window.app = {
    activeAccordionContent: null,
    trackEvent: () => {}
};

// Add some fake items directly into DOM
const container = document.createElement('div');
container.id = 'faq-container';
document.body.appendChild(container);

let htmlStr = '';
for(let i=0; i<100; i++) {
    htmlStr += `
        <div class="accordion-item">
            <button><span>Question ${i}</span><span class="icon"><svg></svg></span></button>
            <div class="accordion-content ${i===0?'active':''}">Answer ${i}</div>
        </div>
    `;
}
container.innerHTML = htmlStr;

// Simulate the function we wrote
window.app.toggleAccordion = function(button) {
    const item = button.closest('.accordion-item');
    const content = item.querySelector('.accordion-content');
    const icon = button.querySelector('span svg');

    const isActive = content.classList.contains('active');

    if (window.app.activeAccordionContent && window.app.activeAccordionContent !== content) {
        const otherButton = window.app.activeAccordionContent.closest('.accordion-item').querySelector('button');
        const otherIcon = otherButton ? otherButton.querySelector('span svg') : null;

        window.app.activeAccordionContent.classList.remove('active');
        window.app.activeAccordionContent.style.maxHeight = '0';
        if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
    }

    content.classList.toggle('active');
    const questionText = button.querySelector('span').innerText;
    if (isActive) {
        content.style.maxHeight = '0';
        if(icon) icon.style.transform = 'rotate(0deg)';
        window.app.activeAccordionContent = null;
        window.app.trackEvent('FAQ Closed', { 'Question': questionText });
    } else {
        // Mock scrollHeight
        content.style.maxHeight = "50px";
        if(icon) icon.style.transform = 'rotate(180deg)';
        window.app.activeAccordionContent = content;
        window.app.trackEvent('FAQ Opened', { 'Question': questionText });
    }
};

const buttons = document.querySelectorAll('.accordion-item button');

// Initialize the first active content correctly for the benchmark
window.app.activeAccordionContent = document.querySelector('.accordion-item .accordion-content.active');

const start = process.hrtime.bigint();
for (let i = 0; i < 5000; i++) {
    window.app.toggleAccordion(buttons[i % buttons.length]);
}
const end = process.hrtime.bigint();

console.log(`Execution time: ${Number(end - start) / 1e6} ms`);
