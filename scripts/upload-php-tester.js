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
echo "=== Hostinger Environment Diagnostics ===" . PHP_EOL;
echo "PHP Version: " . phpversion() . PHP_EOL;
echo "User: " . get_current_user() . " (UID: " . getmyuid() . ")" . PHP_EOL;
echo "Disabled functions: " . (ini_get('disable_functions') ?: 'NONE') . PHP_EOL;

$nodePaths = [
    '/opt/alt/alt-nodejs22/root/usr/bin/node',
    '/opt/alt/alt-nodejs20/root/usr/bin/node',
    '/usr/bin/node',
    '/usr/local/bin/node'
];

foreach ($nodePaths as $np) {
    if (file_exists($np)) {
        echo "Found node at: $np" . PHP_EOL;
        $ver = @shell_exec("$np -v 2>&1");
        echo "Version: " . trim($ver) . PHP_EOL;
    }
}

// Check if running processes
echo "Checking running processes:" . PHP_EOL;
echo @shell_exec("ps aux | grep node 2>&1") . PHP_EOL;
`;

  fs.writeFileSync('test-diag.php', phpCode);
  await client.uploadFrom('test-diag.php', 'speedpilot/diag.php');
  fs.unlinkSync('test-diag.php');
  client.close();
  console.log('diag.php uploaded successfully');
}

run().catch(console.error);

