const { Client } = require('ssh2');

const conn = new Client();

const script = `
const net = require('net');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const srv = net.createServer();
srv.listen(0, '127.0.0.1', () => {
  const port = srv.address().port;
  srv.close(() => {
    console.log('Testing port:', port);
    
    const env = {
      ...process.env,
      PORT: port.toString(),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      PRISMA_QUERY_ENGINE_LIBRARY: '/home/u784475034/public_html/speedpilot/node_modules/.prisma/client/libquery_engine-debian-openssl-1.1.x.so.node',
    };
    
    const proc = spawn('/opt/alt/alt-nodejs22/root/usr/bin/node', ['apps/web/server.js'], {
      cwd: '/home/u784475034/public_html/speedpilot',
      env,
    });
    
    proc.stdout.on('data', d => {
      const txt = d.toString();
      process.stdout.write(txt);
      if (txt.includes('Ready in') || txt.includes('started server on')) {
        console.log('Server is ready! Testing HTTP GET request...');
        http.get(\`http://127.0.0.1:\${port}/\`, (res) => {
          console.log('HTTP Status:', res.statusCode);
          console.log('HTTP Headers:', res.headers);
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            console.log('Body length:', body.length);
            console.log('Body preview:', body.slice(0, 300));
            proc.kill();
            process.exit(0);
          });
        }).on('error', (e) => {
          console.error('HTTP Request failed:', e.message);
          proc.kill();
          process.exit(1);
        });
      }
    });
    
    proc.stderr.on('data', d => process.stderr.write('ERR: ' + d.toString()));
    
    proc.on('exit', (code) => {
      console.log('Process exited with code:', code);
    });
  });
});
`;

conn.on('ready', () => {
  const b64 = Buffer.from(script).toString('base64');
  conn.exec(`/opt/alt/alt-nodejs22/root/usr/bin/node -e "eval(Buffer.from('${b64}', 'base64').toString())"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', code => {
      console.log('Script done, code:', code);
      conn.end();
    });
  });
}).on('error', err => {
  console.error('SSH Error:', err);
}).connect({
  host: '89.116.133.236',
  port: 65002,
  username: 'u784475034',
  password: process.env.FTP_PASSWORD,
});

