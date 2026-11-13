const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  conn.exec("cd ~/public_html/speedpilot && PORT=26605 /opt/alt/alt-nodejs22/root/usr/bin/node server.js", (err, stream) => {
    stream.on('data', d => console.log('STDOUT:', d.toString()));
    stream.stderr.on('data', d => console.log('STDERR:', d.toString()));
    stream.on('close', code => {
      console.log('Exited code:', code);
      conn.end();
    });
  });
}).connect({
  host: '89.116.133.236',
  port: 65002,
  username: 'u784475034',
  password: process.env.FTP_PASSWORD,
});
