import mongoose, { Document, Schema } from 'mongoose';

export interface IPlatformSettings extends Document {
  platformFeePercent: number;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  maxTaskPrice: number;
  contactEmail: string;
}

const platformSettingsSchema = new Schema<IPlatformSettings>(
  {
    platformFeePercent: { type: Number, default: 20, min: 0, max: 100 },
    maintenanceMode: { type: Boolean, default: false },
    registrationOpen: { type: Boolean, default: true },
    maxTaskPrice: { type: Number, default: 10000 },
    contactEmail: { type: String, default: '' },
  },
  { timestamps: true }
);

export const PlatformSettings = mongoose.model<IPlatformSettings>('PlatformSettings', platformSettingsSchema);
