import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { config } from '../../config/configuration';
import { RefreshToken, RolePermission, User } from '../../database/entities';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RolePermission, RefreshToken]),
    JwtModule.register({ secret: config.jwt.accessSecret }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Urutan penting: autentikasi dulu, baru cek permission
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AuthModule {}
