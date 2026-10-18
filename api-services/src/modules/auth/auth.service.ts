import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hashSync } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception';
import { AccessTokenPayload, AuthUser, RoleCode } from '../../common/interfaces/auth-user.interface';
import { config } from '../../config/configuration';
import { RefreshToken, RolePermission, User } from '../../database/entities';
import { AuthTokensResponseDto } from './dto/auth-response.dto';

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

// Hanya dipakai untuk menyamakan waktu proses login saat username tidak ada
const DUMMY_PASSWORD_HASH = hashSync(randomBytes(16).toString('hex'), 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async login(username: string, password: string): Promise<AuthTokensResponseDto> {
    const user = await this.users.findOne({ where: { username }, relations: { role: true } });
    // Tetap menjalankan bcrypt walaupun user tidak ada, dan pesan error dibuat sama untuk semua kegagalan,
    // supaya tidak bisa ditebak username mana yang terdaftar
    const passwordMatches = await compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !user.isActive || !passwordMatches) {
      throw AppException.unauthorized();
    }

    return this.issueTokens(this.dataSource.manager, await this.toAuthUser(user));
  }

  /** Rotasi refresh token: token lama ditandai terpakai dan pasangan token baru diterbitkan. */
  async refresh(refreshToken: string): Promise<AuthTokensResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const stored = await manager
        .getRepository(RefreshToken)
        .createQueryBuilder('token')
        .setLock('pessimistic_write')
        .where('token.token_hash = :hash', { hash: hashToken(refreshToken) })
        .getOne();

      if (!stored || stored.usedAt || stored.expiresAt <= new Date()) {
        throw AppException.unauthorized();
      }
      await manager.getRepository(RefreshToken).update(stored.id, { usedAt: new Date() });

      const user = await this.findActiveAuthUser(stored.userId, manager);
      if (!user) throw AppException.unauthorized();

      return this.issueTokens(manager, user);
    });
  }

  /** Dipakai JwtAuthGuard di setiap request. */
  async findActiveAuthUser(userId: string, manager: EntityManager = this.dataSource.manager): Promise<AuthUser | null> {
    const user = await manager.getRepository(User).findOne({
      where: { id: userId, isActive: true },
      relations: { role: true },
    });
    return user ? this.toAuthUser(user, manager) : null;
  }

  private async toAuthUser(user: User, manager: EntityManager = this.dataSource.manager): Promise<AuthUser> {
    const rolePermissions = await manager.getRepository(RolePermission).find({
      where: { roleId: user.roleId },
      relations: { permission: true },
    });
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role.code as RoleCode,
      permissions: rolePermissions.map((rp) => rp.permission.code).sort(),
    };
  }

  private async issueTokens(manager: EntityManager, user: AuthUser): Promise<AuthTokensResponseDto> {
    const payload: AccessTokenPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: config.jwt.accessExpiresInSeconds,
    });

    const refreshToken = randomBytes(48).toString('base64url');
    await manager.getRepository(RefreshToken).insert({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + config.jwt.refreshExpiresInSeconds * 1000),
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: config.jwt.accessExpiresInSeconds,
      refresh_token: refreshToken,
      refresh_expires_in: config.jwt.refreshExpiresInSeconds,
      user,
    };
  }
}
