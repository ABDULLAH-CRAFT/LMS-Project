import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';

dotenv.config(); // reads lms-backend/.env (scripts are run from the lms-backend folder)

// Used ONLY by the TypeORM CLI (migration:run / revert / show). No entities are
// needed because the migrations are hand-written SQL.
export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [],
  migrations: [join(__dirname, '..', 'migrations', '*.ts')],
  migrationsTableName: 'migrations',
  synchronize: false,
});