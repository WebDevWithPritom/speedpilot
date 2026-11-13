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

foreach ([18, 20, 22] as $v) {
    $node = "/opt/alt/alt-nodejs$v/root/usr/bin/node";
    $cmd = "$node -e \\"console.log('Node $v ran successfully!');\\"";
    $descriptors = [0 => ["pipe", "r"], 1 => ["pipe", "w"], 2 => ["pipe", "w"]];
    $proc = @proc_open($cmd, $descriptors, $pipes);
    if (is_resource($proc)) {
        $out = stream_get_contents($pipes[1]);
        $err = stream_get_contents($pipes[2]);
        fclose($pipes[0]); fclose($pipes[1]); fclose($pipes[2]);
        $code = proc_close($proc);
        echo "Node $v: exit $code | OUT: " . trim($out) . " | ERR: " . trim($err) . PHP_EOL;
    }
}
`;

  fs.writeFileSync('test-node-versions.php', phpCode);
  await client.uploadFrom('test-node-versions.php', 'speedpilot/diag.php');
  fs.unlinkSync('test-node-versions.php');
  client.close();
}

run().catch(console.error);

