const { Client } = require('ssh2');

const conn = new Client();

const remoteScript = `
const net = require('net');
const fs = require('fs');
const { spawn } = require('child_process');

// Find a free port
const server = net.createServer();
server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  server.close(() => {
    console.log('Selected free port:', port);
    
    // Save port to a config file for .htaccess / index.php
    fs.writeFileSync('/home/u784475034/public_html/speedpilot/.port', port.toString());
    
    // Write run.sh
    const runSh = \`#!/bin/bash
cd /home/u784475034/public_html/speedpilot
pkill -f "apps/web/server.js" 2>/dev/null || true
sleep 1
export PORT=\${port}
export HOSTNAME="127.0.0.1"
export NODE_ENV="production"
export PRISMA_QUERY_ENGINE_LIBRARY="/home/u784475034/public_html/speedpilot/node_modules/.prisma/client/libquery_engine-debian-openssl-1.1.x.so.node"
nohup /opt/alt/alt-nodejs22/root/usr/bin/node apps/web/server.js > speedpilot.log 2>&1 &
echo \$! > speedpilot.pid
\`;
    fs.writeFileSync('/home/u784475034/public_html/speedpilot/run.sh', runSh);
    fs.chmodSync('/home/u784475034/public_html/speedpilot/run.sh', 0o755);
    
    // Also update index.php to dynamically read .port!
    const indexPhp = \`<?php
// Dynamic reverse proxy to Next.js standalone
\\$portFile = __DIR__ . '/.port';
\\$port = file_exists(\\$portFile) ? trim(file_get_contents(\\$portFile)) : '39210';
\\$target = 'http://127.0.0.1:' . \\$port . \\$_SERVER['REQUEST_URI'];

\\$ch = curl_init();
curl_setopt(\\$ch, CURLOPT_URL, \\$target);
curl_setopt(\\$ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt(\\$ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt(\\$ch, CURLOPT_HEADER, true);
curl_setopt(\\$ch, CURLOPT_CONNECTTIMEOUT, 4);
curl_setopt(\\$ch, CURLOPT_TIMEOUT, 60);

// Forward headers
\\$headers = [];
foreach (getallheaders() as \\$key => \\$value) {
    if (strtolower(\\$key) !== 'host') {
        \\$headers[] = \\$key . ': ' . \\$value;
    }
}
\\$headers[] = 'Host: ' . \\$_SERVER['HTTP_HOST'];
\\$headers[] = 'X-Forwarded-For: ' . (\\$_SERVER['HTTP_X_FORWARDED_FOR'] ?? \\$_SERVER['REMOTE_ADDR']);
\\$headers[] = 'X-Forwarded-Proto: https';
curl_setopt(\\$ch, CURLOPT_HTTPHEADER, \\$headers);

// Forward body for POST/PUT/PATCH
\\$method = \\$_SERVER['REQUEST_METHOD'];
if (\\$method === 'POST') {
    curl_setopt(\\$ch, CURLOPT_POST, true);
    curl_setopt(\\$ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
} elseif (\\$method !== 'GET' && \\$method !== 'HEAD') {
    curl_setopt(\\$ch, CURLOPT_CUSTOMREQUEST, \\$method);
    curl_setopt(\\$ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

\\$response = curl_exec(\\$ch);
if (curl_errno(\\$ch)) {
    http_response_code(502);
    header('Content-Type: text/html');
    echo '<h1>SpeedPilot Gateway</h1><p>Starting Next.js service... please refresh in 3 seconds.</p>';
    // Trigger revive in background
    @exec('bash ' . __DIR__ . '/run.sh > /dev/null 2>&1 &');
    exit;
}

\\$headerSize = curl_getinfo(\\$ch, CURLINFO_HEADER_SIZE);
\\$httpCode = curl_getinfo(\\$ch, CURLINFO_HTTP_CODE);
\\$respHeaders = substr(\\$response, 0, \\$headerSize);
\\$respBody = substr(\\$response, \\$headerSize);
curl_close(\\$ch);

http_response_code(\\$httpCode);
foreach (explode("\\r\\n", \\$respHeaders) as \\$hdr) {
    if (!empty(\\$hdr) && !str_starts_with(strtolower(\\$hdr), 'transfer-encoding:') && !str_starts_with(strtolower(\\$hdr), 'content-length:')) {
        header(\\$hdr, false);
    }
}
echo \\$respBody;
\`;
    fs.writeFileSync('/home/u784475034/public_html/speedpilot/index.php', indexPhp);

    console.log('Setup written successfully. Now launching run.sh...');
    const child = spawn('bash', ['/home/u784475034/public_html/speedpilot/run.sh'], { detached: true, stdio: 'inherit' });
    child.unref();
  });
});
`;

conn.on('ready', () => {
  console.log('SSH connection established. Executing remote setup...');
  // We send the script as a base64 string to avoid any shell escaping issues
  const b64 = Buffer.from(remoteScript).toString('base64');
  conn.exec(`/opt/alt/alt-nodejs22/root/usr/bin/node -e "eval(Buffer.from('${b64}', 'base64').toString())"`, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', (code) => {
      console.log('Remote setup exited with code', code);
      conn.end();
    });
  });
}).on('error', err => {
  console.error('SSH Error:', err.message);
}).connect({
  host: '89.116.133.236',
  port: 65002,
  username: 'u784475034',
  password: process.env.FTP_PASSWORD,
});

