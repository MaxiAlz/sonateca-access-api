import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ScannerLoginDto {
  @ApiProperty({
    description: 'Código PIN de 6 dígitos del evento generado por el productor',
    example: '849201',
  })
  @IsString()
  @IsNotEmpty({ message: 'El PIN de puerta es requerido' })
  @Matches(/^\d{6}$/, {
    message: 'El PIN debe ser un código numérico de 6 dígitos',
  })
  pinCode: string;
}

export class ScannerTicketQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Búsqueda por DNI, nombre, código QR o referencia',
    example: 'Lucía',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class CheckInActionDto {
  @ApiProperty({
    description: 'Código único de la invitación QR (ej: SNT-1002)',
    example: 'SNT-1002',
  })
  @IsString()
  @IsNotEmpty({ message: 'El código de la invitación es requerido' })
  code: string;

  @ApiProperty({
    description:
      'Cantidad de personas que ingresan en este momento (1 hasta la cantidad de pendientes)',
    example: 2,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @Max(20, { message: 'La cantidad no puede superar 20' })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Nota interna u observación opcional del portero',
    example: 'Llegan 2 de los 4',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class TempExitActionDto {
  @ApiProperty({
    description: 'Código único de la invitación QR (ej: SNT-1002)',
    example: 'SNT-1002',
  })
  @IsString()
  @IsNotEmpty({ message: 'El código de la invitación es requerido' })
  code: string;

  @ApiProperty({
    description: 'Cantidad de personas que salen temporalmente',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Nota o motivo opcional de salida temporal',
    example: 'Sale a fumar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class ReEntryActionDto {
  @ApiProperty({
    description: 'Código único de la invitación QR (ej: SNT-1002)',
    example: 'SNT-1002',
  })
  @IsString()
  @IsNotEmpty({ message: 'El código de la invitación es requerido' })
  code: string;

  @ApiProperty({
    description: 'Cantidad de personas que reingresan al local',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Nota u observación opcional del reingreso',
    example: 'Vuelve a ingresar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class DoorEntryDto {
  @ApiProperty({
    description: 'Nombre o referencia del asistente que entra por puerta',
    example: 'Asistente Puerta - Efectivo',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre o referencia es requerido' })
  @MaxLength(150)
  guestName: string;

  @ApiPropertyOptional({
    description: 'DNI del asistente en puerta',
    example: '35123987',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  guestDni?: string;

  @ApiProperty({
    description: 'Cantidad de personas que ingresan directamente',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @Max(20, { message: 'La cantidad no puede superar 20' })
  totalGuests: number;

  @ApiPropertyOptional({
    description: 'Nota u observación opcional de cobro / ingreso en puerta',
    example: 'Cobro en efectivo en puerta',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}
