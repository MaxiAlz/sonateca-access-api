import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SequelizeModule } from '@nestjs/sequelize';
import { DoorCode, Event, Ticket, TicketLog } from '../../database/models';
import { ScannerAuthGuard } from './guards/scanner.guard';
import { ScannerController } from './scanner.controller';
import { ScannerService } from './scanner.service';

@Module({
  imports: [
    SequelizeModule.forFeature([DoorCode, Event, Ticket, TicketLog]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'sonateca_access_super_secret_key_2026',
        signOptions: {
          expiresIn: '24h',
        },
      }),
    }),
  ],
  controllers: [ScannerController],
  providers: [ScannerService, ScannerAuthGuard],
  exports: [ScannerService],
})
export class ScannerModule {}
