const ftp = require('basic-ftp');
const fs = require('fs');

async function run() {
  const client = new ftp.Client();
  await client.access({
    host: '89.116.133.236',
    user: 'u784475034',
    password: process.env.FTP_PASSWORD,
  });

  const daemonSh = `#!/bin/bash
export HOME=/home/u784475034
export PATH=/opt/alt/alt-nodejs22/root/usr/bin:/usr/local/bin:/usr/bin:/bin
DIR="/home/u784475034/public_html/speedpilot"
cd "$DIR"

PORT=29471

# Check if node is already running and responding
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/" 2>/dev/null)
if [ "$STATUS" = "200" ] || [ "$STATUS" = "307" ] || [ "$STATUS" = "308" ]; then
    echo "SpeedPilot Next.js is already running healthy on port $PORT (HTTP $STATUS)"
    exit 0
fi

echo "Starting SpeedPilot Next.js on port $PORT..."
pkill -f "apps/web/server.js" 2>/dev/null || true
sleep 1

export PORT=$PORT
export HOSTNAME="127.0.0.1"
export NODE_ENV="production"
export PRISMA_QUERY_ENGINE_LIBRARY="$DIR/node_modules/.prisma/client/libquery_engine-debian-openssl-1.1.x.so.node"

echo "$PORT" > .port
nohup /opt/alt/alt-nodejs22/root/usr/bin/node apps/web/server.js >> speedpilot.log 2>&1 &
echo $! > speedpilot.pid
echo "SpeedPilot Next.js launched with PID $(cat speedpilot.pid)"
`;

  fs.writeFileSync('daemon.sh', daemonSh);
  await client.uploadFrom('daemon.sh', 'speedpilot/daemon.sh');
  fs.unlinkSync('daemon.sh');

  try {
    await client.send('SITE CHMOD 755 speedpilot/daemon.sh');
  } catch (e) {
    console.warn('[upload-daemon] Warning: CHMOD command was ignored or not supported:', e.message);
  }

  // Also remove test diag.php to keep directory clean
  try {
    await client.remove('speedpilot/diag.php');
  } catch (e) {
    console.warn('[upload-daemon] Info: diag.php already clean or removal failed:', e.message);
  }

  console.log('daemon.sh uploaded and set to executable (755)!');
  client.close();
}

run().catch(console.error);

