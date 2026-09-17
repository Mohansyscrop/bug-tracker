import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const adminHash = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bugtracker.local' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@bugtracker.local',
      passwordHash: adminHash,
      globalRole: 'ADMIN',
    },
  });

  const devHash = await bcrypt.hash('Dev@123456', 12);
  const dev1 = await prisma.user.upsert({
    where: { email: 'alice@bugtracker.local' },
    update: {},
    create: { name: 'Alice Dev', email: 'alice@bugtracker.local', passwordHash: devHash },
  });

  const qa1 = await prisma.user.upsert({
    where: { email: 'bob@bugtracker.local' },
    update: {},
    create: { name: 'Bob QA', email: 'bob@bugtracker.local', passwordHash: devHash },
  });

  const lead1 = await prisma.user.upsert({
    where: { email: 'carol@bugtracker.local' },
    update: {},
    create: { name: 'Carol Lead', email: 'carol@bugtracker.local', passwordHash: devHash },
  });

  console.log('✅ Users created');

  // Create projects
  let project = await prisma.project.findFirst({ where: { key: 'BT' } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'Bug Tracker',
        key: 'BT',
        description: 'Internal bug tracker application',
        createdById: admin.id,
      },
    });
    await prisma.projectKeySequence.create({ data: { projectKey: 'BT', lastSeq: 0 } });
  }

  // Add project members
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: admin.id } },
    update: {},
    create: { projectId: project.id, userId: admin.id, projectRole: 'LEAD' },
  });
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: dev1.id } },
    update: {},
    create: { projectId: project.id, userId: dev1.id, projectRole: 'DEV' },
  });
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: qa1.id } },
    update: {},
    create: { projectId: project.id, userId: qa1.id, projectRole: 'QA' },
  });
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: lead1.id } },
    update: {},
    create: { projectId: project.id, userId: lead1.id, projectRole: 'LEAD' },
  });

  console.log('✅ Project members added');

  // Create milestone
  const milestone = await prisma.milestone.create({
    data: {
      projectId: project.id,
      name: 'v1.0 Launch',
      versionCode: '1.0.0',
      releaseDate: new Date('2026-10-31'),
    },
  });

  // Create component
  const component = await prisma.component.create({
    data: { projectId: project.id, name: 'Authentication', leadId: dev1.id },
  });

  // Create sample bugs
  const bugData = [
    {
      title: 'Login fails with valid credentials on Safari',
      description: 'Users cannot log in using Safari 17.x on macOS Sonoma.',
      stepsToReproduce: '1. Open Safari 17\n2. Navigate to /login\n3. Enter valid credentials\n4. Click Submit',
      expectedResult: 'User should be logged in and redirected to dashboard',
      actualResult: 'Page reloads with no error message, user not authenticated',
      severity: 'CRITICAL',
      priority: 'P1',
      environment: 'Production',
    },
    {
      title: 'Dashboard charts not rendering on mobile viewport',
      description: 'The bug statistics charts on the dashboard are invisible on mobile devices.',
      stepsToReproduce: '1. Log in\n2. Navigate to /dashboard\n3. Resize window to 375px wide',
      expectedResult: 'Charts should be responsive and render correctly',
      actualResult: 'Charts show empty white space, no data visible',
      severity: 'HIGH',
      priority: 'P2',
      environment: 'Staging',
    },
    {
      title: 'Incorrect bug count shown in project stats',
      description: 'The bug count in the project summary shows total bugs including deleted ones.',
      stepsToReproduce: '1. Delete 3 bugs\n2. View project stats',
      expectedResult: 'Count should exclude deleted bugs',
      actualResult: 'Count includes deleted bugs',
      severity: 'MEDIUM',
      priority: 'P2',
      environment: 'Production',
    },
    {
      title: 'Comment textarea loses focus on mobile keyboard open',
      description: 'When typing a comment on mobile, the keyboard pushes the textarea out of view.',
      stepsToReproduce: '1. Open bug detail on mobile\n2. Tap comment textarea',
      expectedResult: 'Textarea should scroll into view',
      actualResult: 'Textarea is hidden behind keyboard',
      severity: 'LOW',
      priority: 'P4',
      environment: 'QA-Env-1',
    },
  ];

  let seq = 0;
  for (const bug of bugData) {
    seq++;
    const issueKey = `BT-${seq}`;
    const exists = await prisma.bug.findFirst({ where: { issueKey } });
    if (!exists) {
      await prisma.bug.create({
        data: {
          issueKey,
          projectId: project.id,
          componentId: component.id,
          milestoneId: milestone.id,
          reportedById: qa1.id,
          assignedToId: dev1.id,
          ...bug,
        },
      });
    }
  }

  await prisma.projectKeySequence.update({
    where: { projectKey: 'BT' },
    data: { lastSeq: seq },
  });

  console.log(`✅ ${bugData.length} sample bugs created`);
  console.log('\n🎉 Seed complete!');
  console.log('\nDemo accounts:');
  console.log('  admin@bugtracker.local / Admin@123456  (System Admin)');
  console.log('  alice@bugtracker.local / Dev@123456    (Developer)');
  console.log('  bob@bugtracker.local   / Dev@123456    (QA)');
  console.log('  carol@bugtracker.local / Dev@123456    (Lead)');
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
