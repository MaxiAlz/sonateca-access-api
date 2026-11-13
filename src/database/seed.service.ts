import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcryptjs';
import { Sequelize } from 'sequelize-typescript';
import { User, Event, Ticket, DoorCode } from './models';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Event) private readonly eventModel: typeof Event,
    @InjectModel(Ticket) private readonly ticketModel: typeof Ticket,
    @InjectModel(DoorCode) private readonly doorCodeModel: typeof DoorCode,
  ) {}

  /**
   * Asegura que los cambios incrementales de columnas en PostgreSQL se apliquen
   * con sintaxis nativa válida de Postgres (evitando el bug de Sequelize sync({ alter: true }) con UNIQUE).
   */
  private async ensurePostgresSchemaUpdates() {
    await this.sequelize.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dni" VARCHAR(30);
    `);
    await this.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "users_dni_unique_idx" ON "users" ("dni") WHERE "dni" IS NOT NULL;
    `);
    await this.sequelize.query(`
      ALTER TABLE "users" ALTER COLUMN "role" TYPE VARCHAR(40) USING "role"::text;
    `);
  }

  async onApplicationBootstrap() {
    try {
      await this.ensurePostgresSchemaUpdates();

      // 1. Garantizar siempre que exista el SuperAdmin configurado en .env
      const superAdminEmail = (
        this.configService.get<string>('SUPERADMIN_EMAIL') ||
        'admin@sonateca.com'
      )
        .trim()
        .toLowerCase();
      const superAdminPassword =
        this.configService.get<string>('SUPERADMIN_PASSWORD') || 'sonateca123';
      const superAdminName =
        this.configService.get<string>('SUPERADMIN_NAME') ||
        'Administrador SONATECA';
      const superAdminDni =
        this.configService.get<string>('SUPERADMIN_DNI') || '30000000';
      const superAdminProducerName =
        this.configService.get<string>('SUPERADMIN_PRODUCER_NAME') ||
        'SONATECA Oficial';
      const superAdminWhatsapp =
        this.configService.get<string>('SUPERADMIN_WHATSAPP') ||
        '+5491100000000';

      const existingSuperAdmin = await this.userModel.findOne({
        where: { email: superAdminEmail },
      });

      if (!existingSuperAdmin) {
        const superAdminHash = await bcrypt.hash(superAdminPassword, 10);
        await this.userModel.create({
          name: superAdminName,
          dni: superAdminDni,
          producerName: superAdminProducerName,
          email: superAdminEmail,
          passwordHash: superAdminHash,
          whatsapp: superAdminWhatsapp,
          role: 'SUPERADMIN',
          isActive: true,
        } as any);
        this.logger.log(
          `✅ Usuario SUPERADMIN inicial creado desde .env (${superAdminEmail})`,
        );
      } else if (!existingSuperAdmin.dni) {
        existingSuperAdmin.dni = superAdminDni;
        await existingSuperAdmin.save();
      }

      // Asegurar que el productor demo tenga su DNI si ya había sido creado antes
      let producer = await this.userModel.findOne({
        where: { email: 'productor@sonateca.com' },
      });
      if (producer && !producer.dni) {
        producer.dni = '32445566';
        await producer.save();
      }

      // 2. Si aún no hay eventos creados, sembrar datos de muestra para pruebas
      const eventsCount = await this.eventModel.count();
      if (eventsCount > 0) {
        this.logger.log(
          'Base de datos ya cuenta con eventos iniciales. Omitiendo seeder de demostración.',
        );
        return;
      }

      this.logger.log('Sembrando datos de demostración de SONATECA ACCESS...');
      const defaultPassword = await bcrypt.hash('sonateca123', 10);

      if (!producer) {
        producer = await this.userModel.create({
          name: 'Productor Demo',
          dni: '32445566',
          producerName: 'Sesiones Nocturnas Producciones',
          email: 'productor@sonateca.com',
          passwordHash: defaultPassword,
          whatsapp: '+5491122334455',
          role: 'PRODUCER',
          isActive: true,
        } as any);
      }

      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + 7);

      const sampleEvent = await this.eventModel.create({
        producerId: producer.id,
        title: 'Noche de Sintetizadores & Live Set Vol. IV',
        slug: 'noche-sintetizadores-live-set-vol-4',
        description:
          'Encuentro de música electrónica analógica, bandas en vivo y visuales inmersivas con sonido integral de SONATECA.',
        venueName: 'Espacio Cultural Estudio Sur',
        venueAddress: 'Av. Libertador 1420',
        city: 'Buenos Aires',
        eventDate,
        doorsOpenTime: '21:30 hs',
        flyerUrl:
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80',
        contactWhatsapp: '+5491122334455',
        informativePrice: 'Invitación previa / Consultar por WhatsApp',
        status: 'PUBLISHED',
        ticketsQuota: 50,
        usedTicketsQuota: 5,
      } as any);

      await this.doorCodeModel.create({
        eventId: sampleEvent.id,
        pinCode: '849201',
        label: 'Puerta Principal',
        isActive: true,
      } as any);

      await this.ticketModel.create({
        eventId: sampleEvent.id,
        code: 'SNT-1001',
        guestName: 'Lucía Fernández',
        guestDni: '38451209',
        guestPhone: '+5491155667788',
        referenceTag: 'General',
        notes: 'Invitación individual confirmada',
        originType: 'INVITACION',
        totalGuests: 1,
        checkedInCount: 0,
        currentlyInside: 0,
        checkInStatus: 'PENDING',
        status: 'VALID',
        createdByUserId: producer.id,
      } as any);

      await this.ticketModel.create({
        eventId: sampleEvent.id,
        code: 'SNT-1002',
        guestName: 'Martín Gómez y Grupo',
        guestDni: '35998112',
        guestPhone: '+5491166778899',
        referenceTag: 'Invitado Banda',
        notes: 'Grupo de 4 amigos',
        originType: 'INVITACION',
        totalGuests: 4,
        checkedInCount: 0,
        currentlyInside: 0,
        checkInStatus: 'PENDING',
        status: 'VALID',
        createdByUserId: producer.id,
      } as any);

      this.logger.log(
        `✅ Datos demo listos (SuperAdmin: ${superAdminEmail} | Productor: productor@sonateca.com | PIN Puerta: 849201).`,
      );
    } catch (error) {
      this.logger.error('Error al ejecutar SeedService:', error);
    }
  }
}
