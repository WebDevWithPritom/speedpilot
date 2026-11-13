const ftp = require('basic-ftp');
const fs = require('fs');

async function run() {
  const client = new ftp.Client();
  await client.access({
    host: '89.116.133.236',
    user: 'u784475034',
    password: process.env.FTP_PASSWORD,
  });

  const indexPhp = `<?php
/**
 * SpeedPilot Production Next.js Reverse Proxy
 * Bridges incoming web traffic seamlessly to internal Next.js standalone process.
 */

$portFile = __DIR__ . '/.port';
$port = file_exists($portFile) ? trim(file_get_contents($portFile)) : '29471';
$backend = 'http://127.0.0.1:' . $port;
$targetUrl = $backend . $_SERVER['REQUEST_URI'];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
curl_setopt($ch, CURLOPT_TIMEOUT, 120);

// Forward request headers
$headers = [];
foreach (getallheaders() as $key => $value) {
    $lower = strtolower($key);
    if ($lower !== 'host' && $lower !== 'content-length') {
        $headers[] = "$key: $value";
    }
}
$headers[] = 'Host: ' . $_SERVER['HTTP_HOST'];
$headers[] = 'X-Forwarded-For: ' . ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR']);
$headers[] = 'X-Forwarded-Proto: https';
$headers[] = 'X-Forwarded-Host: ' . $_SERVER['HTTP_HOST'];

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    $input = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
    $headers[] = 'Content-Length: ' . strlen($input);
} elseif ($method !== 'GET' && $method !== 'HEAD') {
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    $input = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
    $headers[] = 'Content-Length: ' . strlen($input);
}

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);

if (curl_errno($ch)) {
    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    header('Retry-After: 3');
    echo '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="3">
    <title>SpeedPilot - Booting Application</title>
    <style>
        body { background: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 36px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .logo { font-size: 24px; font-weight: 700; color: #10b981; margin-bottom: 8px; letter-spacing: -0.02em; }
        .badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 9999px; background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); margin-bottom: 20px; }
        .spinner { width: 36px; height: 36px; border: 3px solid #27272a; border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 20px auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
        p { color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
        .tip { font-size: 12px; color: #71717a; border-top: 1px solid #27272a; padding-top: 16px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">⚡ SpeedPilot</div>
        <div class="badge">Next.js Core Initializing</div>
        <div class="spinner"></div>
        <p>The high-performance audit engine daemon is starting up.<br>Connecting you in 3 seconds...</p>
        <div class="tip">Subdomain: speedpilot.webdevwithpritom.com</div>
    </div>
</body>
</html>';
    exit;
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$respHeaders = substr($response, 0, $headerSize);
$respBody = substr($response, $headerSize);
curl_close($ch);

http_response_code($httpCode);

// Forward backend response headers
foreach (explode("\\r\\n", $respHeaders) as $hdr) {
    if (!empty($hdr)) {
        $hdrLower = strtolower($hdr);
        if (!str_starts_with($hdrLower, 'transfer-encoding:') && 
            !str_starts_with($hdrLower, 'content-length:') &&
            !str_starts_with($hdrLower, 'connection:')) {
            header($hdr, false);
        }
    }
}

echo $respBody;
`;

  fs.writeFileSync('index.php', indexPhp);
  await client.uploadFrom('index.php', 'speedpilot/index.php');
  fs.unlinkSync('index.php');
  console.log('Production index.php uploaded successfully!');
  client.close();
}

run().catch(console.error);

