import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Default,
  PrimaryKey,
} from 'sequelize-typescript';
import { Event } from './event.model';

@Table({
  tableName: 'door_codes',
  timestamps: true,
  underscored: true,
})
export class DoorCode extends Model<DoorCode> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Event)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  eventId: string;

  @BelongsTo(() => Event)
  event: Event;

  @Column({
    type: DataType.STRING(12),
    allowNull: false,
    unique: true,
    comment: 'Código PIN de 6 dígitos para ingreso en sonateca-access-scanner (ej. 849201)',
  })
  pinCode: string;

  @Default('Puerta Principal')
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  label: string;

  @Default(true)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
  })
  isActive: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  expiresAt: Date;
}
