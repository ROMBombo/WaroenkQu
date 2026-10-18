import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';

/** Dipakai healthcheck Docker. Baru bisa diakses setelah migration & seed selesai (lihat main.ts). */
@ApiExcludeController()
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<{ status: string }> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database tidak bisa diakses');
    }
    return { status: 'ok' };
  }
}
