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
echo "Testing Next.js standalone execution via proc_open..." . PHP_EOL;

$port = 28419;
$env = [
    'PORT' => (string)$port,
    'HOSTNAME' => '127.0.0.1',
    'NODE_ENV' => 'production',
    'PRISMA_QUERY_ENGINE_LIBRARY' => '/home/u784475034/public_html/speedpilot/node_modules/.prisma/client/libquery_engine-debian-openssl-1.1.x.so.node',
    'PATH' => '/opt/alt/alt-nodejs22/root/usr/bin:/usr/bin:/bin'
];

$cmd = '/opt/alt/alt-nodejs22/root/usr/bin/node /home/u784475034/public_html/speedpilot/apps/web/server.js';
$descriptors = [
    0 => ["pipe", "r"],
    1 => ["pipe", "w"],
    2 => ["pipe", "w"]
];

$proc = proc_open($cmd, $descriptors, $pipes, '/home/u784475034/public_html/speedpilot', $env);

if (is_resource($proc)) {
    // Non-blocking reads
    stream_set_blocking($pipes[1], 0);
    stream_set_blocking($pipes[2], 0);

    $out = '';
    $err = '';
    for ($i = 0; $i < 20; $i++) {
        usleep(100000); // 100ms
        $out .= stream_get_contents($pipes[1]);
        $err .= stream_get_contents($pipes[2]);
        if (strpos($out, 'Ready in') !== false || strpos($out, 'started server') !== false) {
            echo "SUCCESS: Next.js is ready!" . PHP_EOL;
            break;
        }
    }

    echo "STDOUT:\n" . $out . PHP_EOL;
    echo "STDERR:\n" . $err . PHP_EOL;
    $status = proc_get_status($proc);
    echo "Process running: " . ($status['running'] ? 'YES' : 'NO') . " (PID: " . $status['pid'] . ")" . PHP_EOL;

    // Test curl to local port if running
    if ($status['running']) {
        $ch = curl_init("http://127.0.0.1:$port/");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        echo "Local curl HTTP status: " . $httpCode . " (Response length: " . strlen($res) . ")" . PHP_EOL;
        curl_close($ch);
    }

    proc_terminate($proc);
    fclose($pipes[0]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    proc_close($proc);
} else {
    echo "Failed to start process." . PHP_EOL;
}
`;

  fs.writeFileSync('test-node-proc.php', phpCode);
  await client.uploadFrom('test-node-proc.php', 'speedpilot/diag.php');
  fs.unlinkSync('test-node-proc.php');
  client.close();
}

run().catch(console.error);

