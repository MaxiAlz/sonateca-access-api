import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcryptjs';
import { Op, WhereOptions } from 'sequelize';
import { User } from '../../database/models/user.model';
import {
  AdminCreateUserDto,
  LoginDto,
  RegisterDto,
  UpdateUserRoleDto,
  UserFilterQueryDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User) private readonly userModel: typeof User,
    private readonly jwtService: JwtService,
  ) {}

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      dni: user.dni,
      producerName: user.producerName,
      email: user.email,
      whatsapp: user.whatsapp,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  private generateToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedDni = dto.dni.trim().replace(/[.\s-]/g, '');

    const existingEmail = await this.userModel.findOne({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      throw new BadRequestException('EMAIL_ALREADY_REGISTERED');
    }

    const existingDni = await this.userModel.findOne({
      where: { dni: normalizedDni },
    });
    if (existingDni) {
      throw new BadRequestException('DNI_ALREADY_REGISTERED');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.userModel.create({
      name: dto.name.trim(),
      dni: normalizedDni,
      producerName: dto.producerName.trim(),
      email: normalizedEmail,
      passwordHash,
      whatsapp: dto.whatsapp?.trim() || null,
      role: 'PRODUCER',
      isActive: true,
    } as any);

    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.userModel.findOne({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  async getMe(userId: string) {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new UnauthorizedException('USER_NOT_FOUND');
    }
    return this.sanitizeUser(user);
  }

  async adminCreateUser(dto: AdminCreateUserDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedDni = dto.dni.trim().replace(/[.\s-]/g, '');

    const existingEmail = await this.userModel.findOne({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      throw new BadRequestException('EMAIL_ALREADY_REGISTERED');
    }

    const existingDni = await this.userModel.findOne({
      where: { dni: normalizedDni },
    });
    if (existingDni) {
      throw new BadRequestException('DNI_ALREADY_REGISTERED');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.userModel.create({
      name: dto.name.trim(),
      dni: normalizedDni,
      producerName: dto.producerName.trim(),
      email: normalizedEmail,
      passwordHash,
      whatsapp: dto.whatsapp?.trim() || null,
      role: dto.role || 'PRODUCER',
      isActive: true,
    } as any);

    return this.sanitizeUser(user);
  }

  async adminUpdateUserRole(userId: string, dto: UpdateUserRoleDto) {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    user.role = dto.role;
    if (typeof dto.isActive === 'boolean') {
      user.isActive = dto.isActive;
    }
    await user.save();

    return this.sanitizeUser(user);
  }

  async adminListUsers(query: UserFilterQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const offset = (page - 1) * limit;

    const where: WhereOptions<User> = {};

    if (query.role) {
      where.role = query.role;
    }

    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    if (query.search && query.search.trim() !== '') {
      const searchPattern = `%${query.search.trim()}%`;
      (where as any)[Op.or] = [
        { name: { [Op.iLike]: searchPattern } },
        { dni: { [Op.iLike]: searchPattern } },
        { producerName: { [Op.iLike]: searchPattern } },
        { email: { [Op.iLike]: searchPattern } },
        { whatsapp: { [Op.iLike]: searchPattern } },
      ];
    }

    const allowedSortFields = [
      'createdAt',
      'name',
      'dni',
      'producerName',
      'email',
      'role',
    ];
    const sortBy = allowedSortFields.includes(query.sortBy || '')
      ? (query.sortBy as string)
      : 'createdAt';
    const sortOrder =
      (query.sortOrder || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { rows, count } = await this.userModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortBy, sortOrder]],
    });

    return {
      items: rows.map((u) => this.sanitizeUser(u)),
      totalItems: count,
      page,
      limit,
    };
  }
}
