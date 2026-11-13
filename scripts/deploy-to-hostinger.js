const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ftp = require('basic-ftp');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  console.log('🚀 SpeedPilot Hostinger Deployment Process Started');

  const standaloneDir = path.resolve('apps/web/.next/standalone');
  if (!fs.existsSync(standaloneDir)) {
    throw new Error('Standalone directory does not exist! Please run next build first.');
  }

  // 1. Copy static assets
  console.log('📦 Step 1: Copying Next.js static assets into standalone bundle...');
  const staticSrc = path.resolve('apps/web/.next/static');
  const staticDest = path.resolve('apps/web/.next/standalone/apps/web/.next/static');
  copyDir(staticSrc, staticDest);

  // 2. Write root server.js
  console.log('⚡ Step 2: Creating root server.js entry point...');
  const rootServerCode = [
    "const path = require('path');",
    "process.env.PORT = process.env.PORT || process.env.SERVER_PORT || 3000;",
    "process.env.NODE_ENV = 'production';",
    "console.log('Starting SpeedPilot server on port ' + process.env.PORT + '...');",
    "require(path.join(__dirname, 'apps', 'web', 'server.js'));",
  ].join('\n');
  fs.writeFileSync(path.join(standaloneDir, 'server.js'), rootServerCode);

  // 3. Write .htaccess
  console.log('🛡️ Step 3: Writing LiteSpeed routing & reverse proxy rules...');
  const htaccessCode = [
    "# SpeedPilot LiteSpeed / Apache Routing",
    "DirectoryIndex index.php index.html",
    "",
    "<IfModule mod_rewrite.c>",
    "    RewriteEngine On",
    "    # If Hostinger Node.js application is active on local port, proxy all traffic",
    "    RewriteCond %{ENV:PORT} !^$",
    "    RewriteRule ^(.*)$ http://127.0.0.1:%{ENV:PORT}/$1 [P,L]",
    "</IfModule>",
  ].join('\n');
  fs.writeFileSync(path.join(standaloneDir, '.htaccess'), htaccessCode);

  // 4. Write index.php fallback
  console.log('🌐 Step 4: Writing index.php hostinger launcher...');
  const indexPhpCode = `<?php
/**
 * SpeedPilot Enterprise Deployment Portal
 * Subdomain: speedpilot.webdevwithpritom.com
 */
$nodeAppRunning = false;
$localPort = getenv('PORT') ?: 3000;

// Test if local Node process is listening
$connection = @fsockopen('127.0.0.1', $localPort, $errno, $errstr, 0.5);
if (is_resource($connection)) {
    fclose($connection);
    $nodeAppRunning = true;
}

if ($nodeAppRunning) {
    // Proxy request directly to local Node process
    $url = "http://127.0.0.1:$localPort" . $_SERVER['REQUEST_URI'];
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_HEADER, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    header("Content-Type: $contentType", true, $httpCode);
    echo $response;
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SpeedPilot - Subdomain Status</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    .card { background: #18181b; border: 1px solid #27272a; padding: 2.5rem; border-radius: 16px; max-width: 520px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
    h1 { font-size: 1.5rem; margin: 1rem 0 0.5rem; }
    p { color: #a1a1aa; font-size: 14px; line-height: 1.6; }
    .code-box { background: #09090b; border: 1px solid #27272a; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #60a5fa; margin: 1rem 0; word-break: break-all; }
    .steps { text-align: left; background: #27272a/30; border: 1px solid #27272a; border-radius: 8px; padding: 16px; font-size: 13px; color: #d4d4d8; margin: 1.5rem 0; }
    .steps li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">● SpeedPilot Files Uploaded</div>
    <h1>speedpilot.webdevwithpritom.com</h1>
    <p>All Next.js 15 production build files and dependencies have been successfully deployed to your Hostinger server.</p>
    
    <div class="steps">
      <div style="font-weight: bold; margin-bottom: 8px; color: #f4f4f5;">To Activate Node.js Daemon in Hostinger hPanel:</div>
      <ol style="padding-left: 20px; margin: 0;">
        <li>Go to <strong>hPanel</strong> &rarr; <strong>Websites</strong> &rarr; <strong>webdevwithpritom.com</strong></li>
        <li>Under <strong>Advanced</strong>, click <strong>Node.js</strong></li>
        <li>Click <strong>Create Application</strong> or select <strong>speedpilot</strong></li>
        <li>Set Application Root: <code>speedpilot</code></li>
        <li>Set Application Startup File: <code>server.js</code></li>
        <li>Select Node.js version <strong>20.x</strong> or <strong>22.x</strong> and click <strong>Save</strong></li>
      </ol>
    </div>

    <p style="font-size: 12px; color: #71717a;">Database: Ready | Domain: speedpilot.webdevwithpritom.com | Platform: Hostinger LiteSpeed</p>
  </div>
</body>
</html>
`;
  fs.writeFileSync(path.join(standaloneDir, 'index.php'), indexPhpCode);

  // 5. Compress standalone folder into zip
  console.log('🗜️ Step 5: Compressing deployment bundle into speedpilot-deploy.zip...');
  const zipPath = path.resolve('speedpilot-deploy.zip');
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  // Compress using PowerShell Compress-Archive
  execSync(
    `powershell -Command "Compress-Archive -Path '${standaloneDir}\\*' -DestinationPath '${zipPath}' -Force"`,
    { stdio: 'inherit' }
  );

  const zipSizeMb = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(2);
  console.log(`✅ Bundle compressed successfully: ${zipSizeMb} MB`);

  // 6. Create server-side unzipper script
  const extractPhpCode = `<?php
$zipFile = __DIR__ . '/speedpilot-deploy.zip';
if (!file_exists($zipFile)) {
    die(json_encode(['error' => 'Zip file not found']));
}
$zip = new ZipArchive;
$res = $zip->open($zipFile);
if ($res === TRUE) {
    $zip->extractTo(__DIR__);
    $zip->close();
    @unlink($zipFile);
    echo json_encode(['status' => 'SUCCESS', 'message' => 'SpeedPilot extracted successfully!']);
} else {
    echo json_encode(['error' => 'Failed to extract zip, code: ' . $res]);
}
`;
  fs.writeFileSync('temp_extract.php', extractPhpCode);

  // 7. Upload to Hostinger FTP
  console.log('📡 Step 7: Connecting to Hostinger FTP (89.116.133.236:21)...');
  const client = new ftp.Client();
  client.ftp.verbose = false;

  await client.access({
    host: '89.116.133.236',
    user: 'u784475034',
    password: process.env.FTP_PASSWORD,
    secure: false,
  });
  console.log('✅ FTP Connected!');

  console.log('📤 Uploading speedpilot-deploy.zip to speedpilot/...');
  await client.uploadFrom(zipPath, 'speedpilot/speedpilot-deploy.zip');

  console.log('📤 Uploading extract.php to speedpilot/...');
  await client.uploadFrom('temp_extract.php', 'speedpilot/extract.php');

  client.close();
  console.log('✅ Upload complete!');

  // 8. Trigger extraction on Hostinger server
  console.log('⚙️ Step 8: Triggering remote extraction on Hostinger...');
  const res = await fetch('https://speedpilot.webdevwithpritom.com/extract.php');
  const data = await res.json();
  console.log('Extraction response:', data);

  // 9. Clean up extract.php from server
  console.log('🧹 Step 9: Cleaning up deployment artifacts...');
  const cleanupClient = new ftp.Client();
  cleanupClient.ftp.verbose = false;
  await cleanupClient.access({
    host: '89.116.133.236',
    user: 'u784475034',
    password: process.env.FTP_PASSWORD,
    secure: false,
  });
  await cleanupClient.remove('speedpilot/extract.php').catch(() => {});
  cleanupClient.close();

  // Clean local temporary files
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  if (fs.existsSync('temp_extract.php')) fs.unlinkSync('temp_extract.php');

  console.log('\n🎉 DEPLOYMENT COMPLETE! Visit: https://speedpilot.webdevwithpritom.com/');
}

main().catch((err) => {
  console.error('❌ Deployment failed:', err);
  process.exit(1);
});

