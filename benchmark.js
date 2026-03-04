const { JSDOM } = require("jsdom");
const dom = new JSDOM(`
  <div id="fc-label"></div>
  <div id="fc-value"></div>
  <div id="fc-desc"></div>
  <div id="fc-detail"></div>
  <div id="ind-0"></div>
  <div id="ind-1"></div>
  <div id="ind-2"></div>
  <div id="ind-3"></div>
`);

const document = dom.window.document;

function getUncached() {
    const label = document.getElementById('fc-label');
    const val = document.getElementById('fc-value');
    const desc = document.getElementById('fc-desc');
    const detail = document.getElementById('fc-detail');
    const inds = [0,1,2,3].map(i => document.getElementById('ind-'+i));
    return { label, val, desc, detail, inds };
}

let cache = null;
function getCached() {
    if (!cache) {
        cache = {
            label: document.getElementById('fc-label'),
            val: document.getElementById('fc-value'),
            desc: document.getElementById('fc-desc'),
            detail: document.getElementById('fc-detail'),
            inds: [0,1,2,3].map(i => document.getElementById('ind-'+i))
        };
    }
    return cache;
}

const ITERATIONS = 100000;

console.time("Uncached (Baseline)");
for(let i=0; i<ITERATIONS; i++) {
    getUncached();
}
console.timeEnd("Uncached (Baseline)");

console.time("Cached (Optimized)");
for(let i=0; i<ITERATIONS; i++) {
    getCached();
}
console.timeEnd("Cached (Optimized)");
