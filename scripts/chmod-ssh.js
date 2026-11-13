const ftp = require('basic-ftp');

async function run() {
  const client = new ftp.Client();
  await client.access({
    host: '89.116.133.236',
    user: 'u784475034',
    password: process.env.FTP_PASSWORD,
  });

  try {
    await client.send('SITE CHMOD 700 .ssh');
    console.log('chmod 700 .ssh succeeded');
  } catch (e) {
    console.log('chmod .ssh:', e.message);
  }

  try {
    await client.send('SITE CHMOD 600 .ssh/authorized_keys');
    console.log('chmod 600 .ssh/authorized_keys succeeded');
  } catch (e) {
    console.log('chmod authorized_keys:', e.message);
  }

  client.close();
}

run().catch(console.error);

