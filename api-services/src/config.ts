function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Environment variable ${name} wajib diisi`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  postgres: {
    host: required('POSTGRES_HOST'),
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    database: required('POSTGRES_DB'),
    user: required('POSTGRES_USER'),
    password: required('POSTGRES_PASSWORD'),
  },
  seed: {
    owner: {
      username: required('SEED_OWNER_USERNAME'),
      password: required('SEED_OWNER_PASSWORD'),
    },
    cashiers: [
      {
        username: required('SEED_CASHIER1_USERNAME'),
        password: required('SEED_CASHIER1_PASSWORD'),
      },
      {
        username: required('SEED_CASHIER2_USERNAME'),
        password: required('SEED_CASHIER2_PASSWORD'),
      },
    ],
  },
};
