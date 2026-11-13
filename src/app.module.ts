import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { AppController } from './app.controller';
import { DATABASE_MODELS } from './database/models';
import { SeedService } from './database/seed.service';
import { AuthModule } from './modules/auth/auth.module';
import { CreditsModule } from './modules/credits/credits.module';
import { EventsModule } from './modules/events/events.module';
import { ScannerModule } from './modules/scanner/scanner.module';
import { TicketsModule } from './modules/tickets/tickets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const shouldSync = configService.get<string>('DB_SYNC') !== 'false';
        return {
          dialect: 'postgres',
          host: configService.get<string>('DB_HOST') || 'localhost',
          port: Number(configService.get<string>('DB_PORT')) || 5432,
          username: configService.get<string>('DB_USERNAME') || 'postgres',
          password: configService.get<string>('DB_PASSWORD') || '',
          database: configService.get<string>('DB_NAME') || 'sonateca_access',
          models: DATABASE_MODELS,
          autoLoadModels: true,
          synchronize: shouldSync,
          logging: false,
        };
      },
    }),
    SequelizeModule.forFeature(DATABASE_MODELS),
    AuthModule,
    EventsModule,
    TicketsModule,
    ScannerModule,
    CreditsModule,
  ],
  controllers: [AppController],
  providers: [SeedService],
})
export class AppModule {}
