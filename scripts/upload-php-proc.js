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
echo "Testing proc_open..." . PHP_EOL;

if (function_exists('proc_open')) {
    echo "proc_open is available!" . PHP_EOL;
    $descriptors = [
        0 => ["pipe", "r"],
        1 => ["pipe", "w"],
        2 => ["pipe", "w"]
    ];
    $node = '/opt/alt/alt-nodejs22/root/usr/bin/node';
    $process = @proc_open("$node -v", $descriptors, $pipes);
    if (is_resource($process)) {
        $out = stream_get_contents($pipes[1]);
        fclose($pipes[0]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $return_value = proc_close($process);
        echo "Node version from proc_open: " . trim($out) . " (code: $return_value)" . PHP_EOL;
    } else {
        echo "proc_open failed to start resource" . PHP_EOL;
    }
} else {
    echo "proc_open function does not exist" . PHP_EOL;
}
`;

  fs.writeFileSync('test-proc.php', phpCode);
  await client.uploadFrom('test-proc.php', 'speedpilot/diag.php');
  fs.unlinkSync('test-proc.php');
  client.close();
}

run().catch(console.error);

