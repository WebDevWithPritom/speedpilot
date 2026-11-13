const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');
const { Client } = require('ssh2');

async function main() {
  console.log('🚀 Uploading speedpilot-deploy.tar.gz via FTP...');
  const client = new ftp.Client();
  client.ftp.verbose = false;

  await client.access({
    host: '89.116.133.236',
    user: 'u784475034',
    password: process.env.FTP_PASSWORD,
    secure: false,
  });

  const tarPath = path.resolve('speedpilot-deploy.tar.gz');
  await client.uploadFrom(tarPath, 'speedpilot/speedpilot-deploy.tar.gz');
  client.close();
  console.log('✅ Uploaded speedpilot-deploy.tar.gz successfully!');

  // Now extract via SSH
  console.log('📡 Extracting archive on Hostinger server via SSH...');
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', () => {
      conn.exec('cd ~/public_html/speedpilot && tar -xzf speedpilot-deploy.tar.gz && rm -f speedpilot-deploy.tar.gz && ls -la', (err, stream) => {
        if (err) return reject(err);
        let out = '';
        stream.on('data', (d) => (out += d.toString()));
        stream.stderr.on('data', (d) => (out += d.toString()));
        stream.on('close', (code) => {
          console.log('Extraction Result:\n' + out.slice(0, 500));
          conn.end();
          resolve();
        });
      });
    }).on('error', reject).connect({
      host: '89.116.133.236',
      port: 65002,
      username: 'u784475034',
      password: process.env.FTP_PASSWORD,
    });
  });

  // Clean local tar
  if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);
  console.log('🎉 Extraction complete!');
}

main().catch(console.error);

