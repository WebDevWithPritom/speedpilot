const ftp = require('basic-ftp');
const fs = require('fs');

async function run() {
  const client = new ftp.Client();
  await client.access({
    host: '89.116.133.236',
    user: 'u784475034',
    password: process.env.FTP_PASSWORD,
  });

  const cronPhp = `<?php
/**
 * SpeedPilot Cron Daemon Launcher
 * Executed by Hostinger Cron (/usr/bin/php)
 */

$dir = __DIR__;
$port = '29471';
$portFile = $dir . '/.port';
file_put_contents($portFile, $port);

echo "[" . date('Y-m-d H:i:s') . "] SpeedPilot Cron tick started.\\n";

// Check if server is currently responding on port
$ch = curl_init("http://127.0.0.1:$port/");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 2);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 1);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code >= 200 && $code < 400) {
    echo "SpeedPilot Next.js is already running healthy on port $port (HTTP $code).\\n";
    exit(0);
}

echo "SpeedPilot is not running (HTTP $code). Launching Next.js process...\\n";

// Launch via proc_open in background
$nodePath = '/opt/alt/alt-nodejs22/root/usr/bin/node';
if (!file_exists($nodePath)) {
    $nodePath = '/opt/alt/alt-nodejs20/root/usr/bin/node';
}

$cmd = "nohup $nodePath apps/web/server.js >> speedpilot.log 2>&1 & echo $!";
$env = [
    'PORT' => $port,
    'HOSTNAME' => '127.0.0.1',
    'NODE_ENV' => 'production',
    'PRISMA_QUERY_ENGINE_LIBRARY' => $dir . '/node_modules/.prisma/client/libquery_engine-debian-openssl-1.1.x.so.node',
    'PATH' => '/opt/alt/alt-nodejs22/root/usr/bin:/opt/alt/alt-nodejs20/root/usr/bin:/usr/local/bin:/usr/bin:/bin',
    'HOME' => '/home/u784475034'
];

$descriptors = [
    0 => ['pipe', 'r'],
    1 => ['pipe', 'w'],
    2 => ['pipe', 'w']
];

$proc = proc_open($cmd, $descriptors, $pipes, $dir, $env);
if (is_resource($proc)) {
    $pid = trim(stream_get_contents($pipes[1]));
    fclose($pipes[0]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    proc_close($proc);
    file_put_contents($dir . '/speedpilot.pid', $pid);
    echo "Spawned SpeedPilot background PID: $pid on port $port.\\n";
} else {
    echo "Failed to start proc_open.\\n";
}

// Wait 2 seconds and test
sleep(2);
$ch2 = curl_init("http://127.0.0.1:$port/");
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_TIMEOUT, 3);
$res2 = curl_exec($ch2);
$code2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
curl_close($ch2);

echo "Post-launch check HTTP Status: $code2\\n";
`;

  fs.writeFileSync('cron.php', cronPhp);
  await client.uploadFrom('cron.php', 'speedpilot/cron.php');
  fs.unlinkSync('cron.php');
  console.log('cron.php uploaded successfully!');
  client.close();
}

run().catch(console.error);

