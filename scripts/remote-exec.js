const { Client } = require('ssh2');

const cmd = process.argv[2] || 'pwd';
const conn = new Client();

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', (code) => {
      conn.end();
      process.exit(code || 0);
    });
  });
}).on('error', err => {
  console.error('SSH Error:', err.message);
  process.exit(1);
}).connect({
  host: '89.116.133.236',
  port: 65002,
  username: 'u784475034',
  password: process.env.FTP_PASSWORD,
});

