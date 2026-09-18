import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const adminHash = await bcrypt.hash('Admin@12', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@gmail.com',
      passwordHash: adminHash,
      globalRole: 'ADMIN',
    },
  });

  const devHash = await bcrypt.hash('Mohan@12', 12);
  const dev1 = await prisma.user.upsert({
    where: { email: 'mohan@gmail.com' },
    update: {},
    create: { name: 'Mohan Developer', email: 'mohan@gmail.com', passwordHash: devHash },
  });

  const qa1 = await prisma.user.upsert({
    where: { email: 'bala@gmail.com' },
    update: {},
    create: { name: 'Bala QA', email: 'bala@gmail.com', passwordHash: devHash },
  });

  const lead1 = await prisma.user.upsert({
    where: { email: 'pm@gmail.com' },
    update: {},
    create: { name: 'PM', email: 'pm@gmail.com', passwordHash: devHash },
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

  // Create milestone if not exists
  let milestone = await prisma.milestone.findFirst({
    where: { projectId: project.id, name: 'v1.0 Launch' },
  });
  if (!milestone) {
    milestone = await prisma.milestone.create({
      data: {
        projectId: project.id,
        name: 'v1.0 Launch',
        versionCode: '1.0.0',
        releaseDate: new Date('2026-10-31'),
      },
    });
  }

  // Create component if not exists
  let component = await prisma.component.findFirst({
    where: { projectId: project.id, name: 'Authentication' },
  });
  if (!component) {
    component = await prisma.component.create({
      data: { projectId: project.id, name: 'Authentication', leadId: dev1.id },
    });
  }

  // Create or find Testing Cycles
  let cycle1 = await prisma.testingCycle.findFirst({
    where: { projectId: project.id, cycleNumber: 1 },
  });
  if (!cycle1) {
    cycle1 = await prisma.testingCycle.create({
      data: {
        projectId: project.id,
        name: 'Cycle 01 — Sprint 14 Core Auth & UI Testing',
        cycleNumber: 1,
        description: 'Comprehensive functional test cycle for user authentication and dashboard responsiveness.',
        scope: 'Login, Auth cookies, Dashboard metrics widgets, Session timeout',
        type: 'FUNCTIONAL',
        status: 'IN_PROGRESS',
        environment: 'QA',
        createdById: qa1.id,
      },
    });
  }

  let cycle2 = await prisma.testingCycle.findFirst({
    where: { projectId: project.id, cycleNumber: 2 },
  });
  if (!cycle2) {
    cycle2 = await prisma.testingCycle.create({
      data: {
        projectId: project.id,
        name: 'Cycle 02 — Sprint 15 Regression & Comment Interaction',
        cycleNumber: 2,
        description: 'Regression testing on project statistics calculation and mobile comment interactions.',
        scope: 'Project bug metrics, comments, mobile responsive layout',
        type: 'REGRESSION',
        status: 'IN_PROGRESS',
        environment: 'Staging',
        createdById: qa1.id,
      },
    });
  }
  console.log('✅ Testing cycles created');

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
      status: 'ASSIGNED',
      environment: 'Production',
      testingCycleId: cycle1.id,
      bugArea: 'FRONTEND',
    },
    {
      title: 'Dashboard charts not rendering on mobile viewport',
      description: 'The bug statistics charts on the dashboard are invisible on mobile devices.',
      stepsToReproduce: '1. Log in\n2. Navigate to /dashboard\n3. Resize window to 375px wide',
      expectedResult: 'Charts should be responsive and render correctly',
      actualResult: 'Charts show empty white space, no data visible',
      severity: 'HIGH',
      priority: 'P2',
      status: 'IN_PROGRESS',
      environment: 'Staging',
      testingCycleId: cycle1.id,
      bugArea: 'UI_UX',
    },
    {
      title: 'Incorrect bug count shown in project stats',
      description: 'The bug count in the project summary shows total bugs including deleted ones.',
      stepsToReproduce: '1. Delete 3 bugs\n2. View project stats',
      expectedResult: 'Count should exclude deleted bugs',
      actualResult: 'Count includes deleted bugs',
      severity: 'MEDIUM',
      priority: 'P2',
      status: 'ASSIGNED',
      environment: 'Production',
      testingCycleId: cycle2.id,
      bugArea: 'BACKEND',
    },
    {
      title: 'Comment textarea loses focus on mobile keyboard open',
      description: 'When typing a comment on mobile, the keyboard pushes the textarea out of view.',
      stepsToReproduce: '1. Open bug detail on mobile\n2. Tap comment textarea',
      expectedResult: 'Textarea should scroll into view',
      actualResult: 'Textarea is hidden behind keyboard',
      severity: 'LOW',
      priority: 'P4',
      status: 'IN_PROGRESS',
      environment: 'QA-Env-1',
      testingCycleId: cycle2.id,
      bugArea: 'FRONTEND',
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
    } else {
      // Update existing bugs to link testing cycle and proper status
      await prisma.bug.update({
        where: { id: exists.id },
        data: {
          testingCycleId: bug.testingCycleId,
          assignedToId: dev1.id,
          status: bug.status,
          bugArea: bug.bugArea,
        },
      });
    }
  }

  await prisma.projectKeySequence.update({
    where: { projectKey: 'BT' },
    data: { lastSeq: seq },
  });

  console.log(`✅ ${bugData.length} sample bugs updated/created`);
  console.log('\n🎉 Seed complete!');
  console.log('\nDemo accounts:');
  console.log('  admin@gmail.com | Admin@12 | System Admin');
  console.log('  mohan@gmail.com | Mohan@12 | Developer');
  console.log('  bala@gmail.com   | Bala@12 | QA');
  console.log('  pm@gmail.com | PM@12 | Lead');
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
