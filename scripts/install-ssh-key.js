const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

async function run() {
  const client = new ftp.Client();
  await client.access({
    host: '89.116.133.236',
    user: 'u784475034',
    password: process.env.FTP_PASSWORD,
  });

  const pubKey = fs.readFileSync(path.join(process.env.USERPROFILE, '.ssh', 'speedpilot_key.pub'), 'utf8').trim();

  // Try creating .ssh directory
  try {
    await client.send('MKD .ssh');
  } catch (e) {
    // Might already exist
  }

  // Download existing authorized_keys if present
  let existing = '';
  try {
    fs.writeFileSync('temp_auth_keys', '');
    await client.downloadTo('temp_auth_keys', '.ssh/authorized_keys');
    existing = fs.readFileSync('temp_auth_keys', 'utf8');
  } catch (e) {
    // Doesn't exist yet
  }

  if (!existing.includes(pubKey)) {
    const combined = (existing ? existing.trim() + '\n' : '') + pubKey + '\n';
    fs.writeFileSync('temp_auth_keys', combined);
    await client.uploadFrom('temp_auth_keys', '.ssh/authorized_keys');
    console.log('Appended speedpilot_key.pub to .ssh/authorized_keys on Hostinger!');
  } else {
    console.log('Key already present in .ssh/authorized_keys');
  }

  if (fs.existsSync('temp_auth_keys')) fs.unlinkSync('temp_auth_keys');
  client.close();
}

run().catch(console.error);

