import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database...');
  try {
    const users = await prisma.user.findMany({
      include: {
        memberships: {
          include: {
            workspace: {
              include: {
                apiKeys: true,
                subscription: { include: { plan: true } }
              }
            }
          }
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    console.log(`\n=== REGISTERED USERS (${users.length}) ===`);
    for (const u of users) {
      console.log(`\nUser: ${u.email} (${u.name || 'No Name'})`);
      console.log(`  ID: ${u.id}`);
      console.log(`  Created: ${u.createdAt.toISOString()}`);
      console.log(`  Password Set: ${!!u.passwordHash}`);
      if (u.memberships.length > 0) {
        console.log(`  Workspaces:`);
        for (const m of u.memberships) {
          console.log(`    - ${m.workspace.name} (Role: ${m.role}, Plan: ${m.workspace.subscription?.plan?.code || 'FREE'})`);
          if (m.workspace.apiKeys.length > 0) {
            console.log(`      API Keys:`);
            for (const k of m.workspace.apiKeys) {
              console.log(`        * [${k.id}] Prefix: ${k.keyPrefix} (Name: ${k.name}, Last Used: ${k.lastUsedAt || 'Never'})`);
            }
          }
        }
      }
      if (u.activityLogs.length > 0) {
        console.log(`  Recent Activity Logs (${u.activityLogs.length}):`);
        for (const log of u.activityLogs) {
          console.log(`    * [${log.createdAt.toISOString()}] Action: ${log.action} | Entity: ${log.entityType} (${log.entityId || ''})`);
        }
      } else {
        console.log(`  Activity Logs: None`);
      }
    }

    const allLogs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30
    });
    console.log(`\n=== ALL RECENT ACTIVITY LOGS (${allLogs.length}) ===`);
    for (const log of allLogs) {
      console.log(`[${log.createdAt.toISOString()}] User: ${log.userId} | Action: ${log.action} | Details:`, JSON.stringify(log.metadata || {}));
    }

    // Also check all API Keys in database
    const apiKeys = await prisma.aPIKey.findMany({
      include: {
        workspace: true
      }
    });
    console.log(`\n=== ALL API KEYS (${apiKeys.length}) ===`);
    for (const k of apiKeys) {
      console.log(`Key Prefix: ${k.keyPrefix} | Name: ${k.name} | Workspace: ${k.workspace.name} | Created: ${k.createdAt.toISOString()}`);
    }

  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
