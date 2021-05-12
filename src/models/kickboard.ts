import { Document, Schema, model } from 'mongoose';

import { StatusDoc } from './status';

export interface KickboardDoc extends Document {
  kickboardId: string;
  kickboardCode: string;
  franchiseId: string;
  mode: KickboardMode;
  lost: KickboardLost;
  maxSpeed: number | null;
  collect: KickboardCollect;
  status?: StatusDoc;
  updatedAt?: Date;
  createdAt?: Date;
}

export enum KickboardMode {
  READY = 0,
  INUSE = 1,
  BROKEN = 2,
  COLLECTED = 3,
  UNREGISTERED = 4,
  DISABLED = 5,
}

export enum KickboardLost {
  FINAL = 0,
  THIRD = 1,
  SECOND = 2,
  FIRST = 3,
}

export enum KickboardCollect {
  BATTERY = 0,
  LOCATION = 1,
  BROKEN = 2,
  OTHER = 3,
}

export const KickboardSchema = new Schema(
  {
    kickboardId: { type: String, required: true, unique: true },
    kickboardCode: { type: String, required: true, unique: true },
    franchiseId: { type: String, required: true, index: true },
    regionId: { type: String, required: true, index: true },
    maxSpeed: { type: Number, required: true, default: null },
    photo: { type: String, required: true, default: null},
    mode: {
      type: Number,
      enum: KickboardMode,
      default: KickboardMode.UNREGISTERED,
      required: true,
    },
    lost: { type: Number, enum: KickboardLost, default: null, required: false },
    collect: {
      type: Number,
      enum: KickboardCollect,
      default: null,
      required: false,
    },
    status: { type: Schema.Types.ObjectId, ref: 'status' },
  },
  { timestamps: true }
);

export const KickboardModel = model<KickboardDoc>('kickboard', KickboardSchema);
