import '../src/lib/loadEnv.js';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const systemHash = await bcrypt.hash('system123', 10);
  await prisma.user.upsert({
    where: { email: 'system@attendance.com' },
    update: { role: 'SYSTEM_ADMIN', organizationId: null },
    create: {
      email: 'system@attendance.com',
      passwordHash: systemHash,
      name: 'System Administrator',
      role: 'SYSTEM_ADMIN',
      organizationId: null,
    },
  });

  const org = await prisma.organization.upsert({
    where: { id: 1 },
    update: { status: 'APPROVED' },
    create: {
      id: 1,
      name: 'Demo Construction Co.',
      contactEmail: 'admin@attendance.com',
      contactPhone: '9876500000',
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  });

  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@attendance.com' },
    update: { organizationId: org.id, role: 'ADMIN' },
    create: {
      email: 'admin@attendance.com',
      passwordHash: adminHash,
      name: 'Organization Admin',
      role: 'ADMIN',
      organizationId: org.id,
    },
  });

  const supervisorHash = await bcrypt.hash('super123', 10);
  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@attendance.com' },
    update: { organizationId: org.id },
    create: {
      email: 'supervisor@attendance.com',
      passwordHash: supervisorHash,
      name: 'Site Supervisor',
      role: 'SUPERVISOR',
      organizationId: org.id,
    },
  });

  const distributorHash = await bcrypt.hash('dist123', 10);
  const distributorUser = await prisma.user.upsert({
    where: { email: 'distributor@attendance.com' },
    update: { organizationId: org.id },
    create: {
      email: 'distributor@attendance.com',
      passwordHash: distributorHash,
      name: 'Pay Distributor',
      role: 'DISTRIBUTOR',
      organizationId: org.id,
    },
  });

  const distributor1 = await prisma.distributor.upsert({
    where: { id: 1 },
    update: { organizationId: org.id, userId: distributorUser.id },
    create: {
      organizationId: org.id,
      name: 'Distributor A',
      contactPhone: '9876543210',
      userId: distributorUser.id,
    },
  });

  let distributor2 = await prisma.distributor.findFirst({
    where: { name: 'Distributor B', organizationId: org.id },
  });
  if (!distributor2) {
    distributor2 = await prisma.distributor.create({
      data: {
        organizationId: org.id,
        name: 'Distributor B',
        contactPhone: '9876543211',
      },
    });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const worker1 = await prisma.worker.upsert({
    where: { id: 1 },
    update: { organizationId: org.id },
    create: {
      organizationId: org.id,
      name: 'Ramesh Kumar',
      phone: '9000000001',
      dailyRate: 500,
      payoutIntervalDays: 7,
      payCycleAnchor: today,
      distributorId: distributor1.id,
    },
  });

  const worker2 = await prisma.worker.upsert({
    where: { id: 2 },
    update: { organizationId: org.id },
    create: {
      organizationId: org.id,
      name: 'Suresh Patel',
      phone: '9000000002',
      dailyRate: 600,
      payoutIntervalDays: 2,
      payCycleAnchor: today,
      distributorId: distributor1.id,
    },
  });

  await prisma.worker.upsert({
    where: { id: 3 },
    update: { organizationId: org.id },
    create: {
      organizationId: org.id,
      name: 'Amit Singh',
      phone: '9000000003',
      dailyRate: 450,
      payoutIntervalDays: 7,
      payCycleAnchor: today,
      distributorId: distributor2.id,
    },
  });

  await prisma.supervisorAssignment.upsert({
    where: {
      supervisorId_workerId: { supervisorId: supervisor.id, workerId: worker1.id },
    },
    update: {},
    create: { supervisorId: supervisor.id, workerId: worker1.id },
  });

  await prisma.supervisorAssignment.upsert({
    where: {
      supervisorId_workerId: { supervisorId: supervisor.id, workerId: worker2.id },
    },
    update: {},
    create: { supervisorId: supervisor.id, workerId: worker2.id },
  });

  await prisma.wallet.upsert({
    where: { userId: distributorUser.id },
    update: { distributorId: distributor1.id },
    create: {
      organizationId: org.id,
      userId: distributorUser.id,
      holderType: 'DISTRIBUTOR',
      distributorId: distributor1.id,
    },
  });

  await prisma.wallet.upsert({
    where: { userId: supervisor.id },
    update: {},
    create: {
      organizationId: org.id,
      userId: supervisor.id,
      holderType: 'SUPERVISOR',
    },
  });

  const defaultApiUrl = process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || 'http://localhost:5000/api/v1';
  await prisma.systemSetting.upsert({
    where: { key: 'public_api_base_url' },
    update: {},
    create: {
      key: 'public_api_base_url',
      value: defaultApiUrl,
    },
  });

  console.log('Seed completed:');
  console.log('  System Admin: system@attendance.com / system123');
  console.log('  Org Admin:    admin@attendance.com / admin123  (Demo Construction Co.)');
  console.log('  Supervisor:   supervisor@attendance.com / super123');
  console.log('  Distributor:  distributor@attendance.com / dist123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
