const fs = require('fs');
const path = require('path');

const content = process.env.GOOGLE_SERVICES_JSON;

if (!content) {
  console.error('GOOGLE_SERVICES_JSON env var is not set!');
  process.exit(1);
}

const outputPath = path.join(__dirname, 'google-services.json');
fs.writeFileSync(outputPath, content);
console.log('✅ google-services.json generated successfully');