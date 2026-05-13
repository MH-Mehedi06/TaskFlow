import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  phone?: string;
  role: 'client' | 'tasker' | 'admin';
  avatar?: string;
  isVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  oauthProviders: { provider: string; providerId: string }[];
  location?: { type: 'Point'; coordinates: [number, number] };
  stripeCustomerId?: string;
  fcmToken?: string;
  notifications: { email: boolean; push: boolean };
  comparePassword(plain: string): Promise<boolean>;
  toPublicJSON(): Record<string, unknown>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    phone: { type: String },
    role: { type: String, enum: ['client', 'tasker', 'admin'], default: 'client' },
    avatar: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    oauthProviders: [{ provider: String, providerId: String }],
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
    stripeCustomerId: { type: String },
    fcmToken: { type: String },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ location: '2dsphere' }, { sparse: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toPublicJSON = function (): Record<string, unknown> {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.stripeCustomerId;
  delete obj.__v;
  return obj;
};

export const User = mongoose.model<IUser>('User', userSchema);
