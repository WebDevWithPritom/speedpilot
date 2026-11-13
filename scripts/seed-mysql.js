const { prisma } = require('../packages/database/dist/index.js');

async function main() {
  const ws = await prisma.workspace.upsert({
    where: { slug: 'default-workspace' },
    update: {},
    create: {
      name: 'Default Workspace',
      slug: 'default-workspace',
    },
  });
  console.log('✅ Workspace ready in MySQL:', ws.id, ws.name);

  let p = await prisma.project.findFirst({ where: { workspaceId: ws.id } });
  if (!p) {
    p = await prisma.project.create({
      data: {
        workspaceId: ws.id,
        name: 'Datwyler Enterprise',
        primaryDomain: 'https://datwyler.com',
        techStack: 'WORDPRESS',
      },
    });
  }
  console.log('✅ Project ready in MySQL:', p.id, p.name);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
