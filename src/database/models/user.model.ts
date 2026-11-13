import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  Default,
  PrimaryKey,
} from 'sequelize-typescript';
import { Event } from './event.model';

export const USER_ROLES = ['SUPERADMIN', 'PRODUCER', 'STAFF'] as const;
export type UserRole = (typeof USER_ROLES)[number];

@Table({
  tableName: 'users',
  timestamps: true,
  underscored: true,
})
export class User extends Model<User> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING(120),
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
    unique: true,
    comment: 'Número de DNI / Documento de identidad del usuario',
  })
  dni: string;

  @Column({
    type: DataType.STRING(150),
    allowNull: false,
  })
  producerName: string;

  @Column({
    type: DataType.STRING(150),
    allowNull: false,
    unique: true,
  })
  email: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  passwordHash: string;

  @Column({
    type: DataType.STRING(40),
    allowNull: true,
  })
  whatsapp: string;

  @Default('PRODUCER')
  @Column({
    type: DataType.STRING(40),
    allowNull: false,
    comment: 'Rol escalable del usuario (SUPERADMIN, PRODUCER, STAFF, etc.)',
  })
  role: UserRole;

  @Default(true)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
  })
  isActive: boolean;

  @HasMany(() => Event)
  events: Event[];
}
