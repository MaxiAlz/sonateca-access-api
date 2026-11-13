import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import {
  buildApiResponse,
  buildPaginatedResponse,
} from '../../common/interfaces/api-response.interface';
import { AuthService } from './auth.service';
import { CurrentUser, Roles } from './decorators/auth.decorators';
import {
  AdminCreateUserDto,
  LoginDto,
  RegisterDto,
  UpdateUserRoleDto,
  UserFilterQueryDto,
} from './dto/auth.dto';
import { JwtAuthGuard, RolesGuard } from './guards/auth.guards';

@ApiTags('Auth & Users')
@Controller('auth')
export class AuthController {
  private readonly cookieName: string;
  private readonly isProduction: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.cookieName =
      this.configService.get<string>('COOKIE_NAME') || 'sonateca_access_token';
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie(this.cookieName, token, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/',
    });
  }

  @Post('register')
  @ApiOperation({
    summary: 'Registrar un nuevo Productor / Organizador (Setea Cookie httpOnly)',
    description:
      'Crea una cuenta con rol PRODUCER y guarda automáticamente la sesión en una cookie httpOnly.',
  })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setAuthCookie(res, result.accessToken);
    return buildApiResponse({ user: result.user }, 'USER_REGISTERED');
  }

  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesión con Email y Contraseña (Setea Cookie httpOnly)',
    description:
      'Autentica al usuario y setea automáticamente la cookie httpOnly en el navegador. Credenciales por defecto: admin@sonateca.com / sonateca123 (SUPERADMIN) o productor@sonateca.com / sonateca123 (PRODUCER).',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setAuthCookie(res, result.accessToken);
    return buildApiResponse({ user: result.user }, 'LOGIN_SUCCESS');
  }

  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Get('me')
  @ApiOperation({
    summary: 'Obtener el perfil del usuario actual (vía Cookie httpOnly)',
    description:
      'Lee automáticamente la cookie httpOnly enviada por el navegador tras hacer login y devuelve el perfil y rol actual.',
  })
  async getMe(@CurrentUser() user: { id: string }) {
    const profile = await this.authService.getMe(user.id);
    return buildApiResponse(profile, 'USER_PROFILE');
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Cerrar sesión (Limpia la Cookie httpOnly)',
    description:
      'Elimina la cookie httpOnly del navegador cerrando la sesión activa.',
  })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(this.cookieName, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
    });
    return buildApiResponse(null, 'LOGOUT_SUCCESS');
  }

  // =========================================================
  // ENDPOINTS ESCALABLES DE GESTIÓN DE ROLES (SOLO SUPERADMIN)
  // =========================================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Get('admin/users')
  @ApiOperation({
    summary: '[SUPERADMIN] Listar usuarios con paginado y filtros (rol, estado activo, búsqueda)',
    description:
      'Devuelve el listado paginado de usuarios respetando el contrato estándar PaginatedData<User>. Permite filtrar por role (SUPERADMIN, PRODUCER, STAFF), isActive (true/false) y búsqueda por texto libre (nombre, productora, email o WhatsApp).',
  })
  async listUsers(@Query() query: UserFilterQueryDto) {
    const { items, totalItems, page, limit } =
      await this.authService.adminListUsers(query);
    return buildPaginatedResponse(
      items,
      totalItems,
      page,
      limit,
      'USERS_LIST',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Post('admin/users')
  @ApiOperation({
    summary: '[SUPERADMIN] Crear un nuevo usuario con rol específico (SUPERADMIN, PRODUCER, STAFF)',
    description:
      'Permite a un SuperAdmin dar de alta nuevos administradores, operadores de staff o productores.',
  })
  async adminCreateUser(@Body() dto: AdminCreateUserDto) {
    const created = await this.authService.adminCreateUser(dto);
    return buildApiResponse(created, 'ADMIN_USER_CREATED');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiCookieAuth('sonateca_access_token')
  @ApiBearerAuth('access-token')
  @Patch('admin/users/:id/role')
  @ApiOperation({
    summary: '[SUPERADMIN] Cambiar el rol o estado activo de un usuario',
    description:
      'Permite ascender o cambiar el rol de cualquier usuario existente.',
  })
  async adminUpdateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    const updated = await this.authService.adminUpdateUserRole(id, dto);
    return buildApiResponse(updated, 'USER_ROLE_UPDATED');
  }
}
