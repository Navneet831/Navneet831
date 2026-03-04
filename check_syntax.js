const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('OneDrive/Desktop/Script/index.html', 'utf8');
const scriptContent = html.match(/<script>([\s\S]*?)<\/script>/g);
if (scriptContent) {
  scriptContent.forEach((scriptTag, index) => {
    const code = scriptTag.replace(/<script>/, '').replace(/<\/script>/, '');
    try {
      new vm.Script(code);
      console.log(`Script ${index + 1} syntax: OK`);
    } catch (e) {
      console.error(`Script ${index + 1} syntax error:`, e);
      process.exit(1);
    }
  });
}
