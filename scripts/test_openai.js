const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
});

async function testKey() {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say hello in JSON {"greeting":"hello"}' }],
      response_format: { type: 'json_object' }
    })
  });

  const data = await res.json();
  console.log('OpenAI result:', data.choices?.[0]?.message?.content || data);
}

testKey().catch(console.error);
