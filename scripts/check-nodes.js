const ftp = require('basic-ftp');
const fs = require('fs');

async function run() {
  const client = new ftp.Client();
  await client.access({
    host: '89.116.133.236',
    user: 'u784475034',
    password: process.env.FTP_PASSWORD,
  });

  const phpCode = `<?php
header('Content-Type: text/plain');
$versions = [14, 16, 18, 20, 22];
foreach ($versions as $v) {
    $p = "/opt/alt/alt-nodejs$v/root/usr/bin/node";
    if (file_exists($p)) {
        echo "Node $v: EXISTS at $p" . PHP_EOL;
    } else {
        echo "Node $v: not found" . PHP_EOL;
    }
}
`;

  fs.writeFileSync('test-nodes.php', phpCode);
  await client.uploadFrom('test-nodes.php', 'speedpilot/diag.php');
  fs.unlinkSync('test-nodes.php');
  client.close();
}

run().catch(console.error);

