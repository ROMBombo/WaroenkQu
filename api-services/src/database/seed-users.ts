import { Logger } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';
import { config } from '../config';
import { Role, User } from './entities';

const logger = new Logger('Seed');

interface SeedUser {
  username: string;
  password: string;
  name: string;
  roleCode: 'OWNER' | 'CASHIER';
}

/** Membuat akun seed kalau belum ada. Akun yang sudah ada tidak diubah. */
export async function seedUsers(dataSource: DataSource): Promise<void> {
  const users: SeedUser[] = [
    { ...config.seed.owner, name: 'Owner', roleCode: 'OWNER' },
    ...config.seed.cashiers.map((cashier, index) => ({
      ...cashier,
      name: `Kasir ${index + 1}`,
      roleCode: 'CASHIER' as const,
    })),
  ];

  const roles = dataSource.getRepository(Role);
  const userRepo = dataSource.getRepository(User);

  for (const user of users) {
    const role = await roles.findOneByOrFail({ code: user.roleCode });
    const result = await userRepo
      .createQueryBuilder()
      .insert()
      .values({
        username: user.username,
        passwordHash: await hash(user.password, 10),
        name: user.name,
        roleId: role.id,
      })
      .orIgnore() // ON CONFLICT DO NOTHING
      .execute();
    // raw berisi row dari RETURNING, kosong kalau username sudah ada
    if (result.raw.length > 0) {
      logger.log(`Created user ${user.username} (${user.roleCode})`);
    }
  }
}
