const fs = require('fs');

// We don't even need jsdom to benchmark this logic specifically, but we'll try a lighter jsdom run just to see.
const html = fs.readFileSync('OneDrive/Desktop/Script/index.html', 'utf-8');

const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const dom = new JSDOM(html);
const window = dom.window;
const document = window.document;

// Add some fake items directly into DOM
const container = document.getElementById('faq-container');
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

// The function we are testing
function toggleAccordion(button) {
    const item = button.closest('.accordion-item');
    const content = item.querySelector('.accordion-content');
    const icon = button.querySelector('span svg'); // Might be null but we don't care for bench

    const isActive = content.classList.contains('active');

    document.querySelectorAll('.accordion-item .accordion-content.active').forEach(openContent => {
        // Find the associated button/icon to rotate it back
        const otherButton = openContent.closest('.accordion-item').querySelector('button');
        const otherIcon = otherButton.querySelector('span svg');

        if (openContent !== content) {
            openContent.classList.remove('active');
            openContent.style.maxHeight = '0';
            if(otherIcon) otherIcon.style.transform = 'rotate(0deg)';
        }
    });

    if (isActive) {
        content.classList.remove('active');
        content.style.maxHeight = '0';
        if(icon) icon.style.transform = 'rotate(0deg)';
    } else {
        content.classList.add('active');
        content.style.maxHeight = "500px";
        if(icon) icon.style.transform = 'rotate(180deg)';
    }
}

const buttons = document.querySelectorAll('.accordion-item button');

const start = process.hrtime.bigint();
for (let i = 0; i < 5000; i++) {
    toggleAccordion(buttons[i % buttons.length]);
}
const end = process.hrtime.bigint();
console.log(`Original Execution time: ${Number(end - start) / 1e6} ms`);

// Now the optimized version
let currentlyActiveContent = document.querySelector('.accordion-item .accordion-content.active');
function optimizedToggleAccordion(button) {
    const item = button.closest('.accordion-item');
    const content = item.querySelector('.accordion-content');
    const icon = button.querySelector('span svg'); // Might be null but we don't care for bench

    const isActive = content.classList.contains('active');

    if (currentlyActiveContent && currentlyActiveContent !== content) {
        const otherButton = currentlyActiveContent.closest('.accordion-item').querySelector('button');
        const otherIcon = otherButton.querySelector('span svg');

        currentlyActiveContent.classList.remove('active');
        currentlyActiveContent.style.maxHeight = '0';
        if(otherIcon) otherIcon.style.transform = 'rotate(0deg)';
        currentlyActiveContent = null;
    }

    if (isActive) {
        content.classList.remove('active');
        content.style.maxHeight = '0';
        if(icon) icon.style.transform = 'rotate(0deg)';
        currentlyActiveContent = null;
    } else {
        content.classList.add('active');
        content.style.maxHeight = "500px";
        if(icon) icon.style.transform = 'rotate(180deg)';
        currentlyActiveContent = content;
    }
}

// reset
currentlyActiveContent = document.querySelector('.accordion-item .accordion-content.active');
const start2 = process.hrtime.bigint();
for (let i = 0; i < 5000; i++) {
    optimizedToggleAccordion(buttons[i % buttons.length]);
}
const end2 = process.hrtime.bigint();
console.log(`Optimized Execution time: ${Number(end2 - start2) / 1e6} ms`);
