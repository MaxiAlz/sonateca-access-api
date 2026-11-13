import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { USER_ROLES, UserRole } from '../../../database/models/user.model';

export class LoginDto {
  @ApiProperty({
    description: 'Email del usuario registrado (Productor o SuperAdmin)',
    example: 'productor@sonateca.com',
  })
  @IsEmail({}, { message: 'Debe ingresar un email válido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'sonateca123',
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;
}

export class RegisterDto {
  @ApiProperty({
    description: 'Nombre y apellido del responsable',
    example: 'Carlos Ruiz',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @ApiProperty({
    description: 'Número de DNI / Documento de identidad del usuario',
    example: '36841220',
  })
  @IsString()
  @IsNotEmpty({ message: 'El número de DNI es requerido' })
  dni: string;

  @ApiProperty({
    description: 'Nombre de la productora, ciclo o banda',
    example: 'Ciclo Acústico del Sur',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la productora o banda es requerido' })
  producerName: string;

  @ApiProperty({
    description: 'Email único para iniciar sesión',
    example: 'carlos@productora.com',
  })
  @IsEmail({}, { message: 'Debe ingresar un email válido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña (mínimo 6 caracteres)',
    example: 'secreto123',
  })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiPropertyOptional({
    description: 'Número de WhatsApp de contacto (con código de país)',
    example: '+5491133445566',
  })
  @IsOptional()
  @IsString()
  whatsapp?: string;
}

export class AdminCreateUserDto extends RegisterDto {
  @ApiProperty({
    description: 'Rol asignado al nuevo usuario (escalable)',
    enum: USER_ROLES,
    default: 'SUPERADMIN',
    example: 'SUPERADMIN',
  })
  @IsIn(USER_ROLES, {
    message: `El rol debe ser uno de: ${USER_ROLES.join(', ')}`,
  })
  role: UserRole;
}

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'Nuevo rol para el usuario',
    enum: USER_ROLES,
    example: 'SUPERADMIN',
  })
  @IsIn(USER_ROLES, {
    message: `El rol debe ser uno de: ${USER_ROLES.join(', ')}`,
  })
  role: UserRole;

  @ApiPropertyOptional({
    description: 'Activar o desactivar el acceso del usuario',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UserFilterQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por rol del usuario',
    enum: USER_ROLES,
  })
  @IsOptional()
  @IsIn(USER_ROLES, {
    message: `El filtro de rol debe ser uno de: ${USER_ROLES.join(', ')}`,
  })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Filtrar por estado activo (true / false)',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;
}
