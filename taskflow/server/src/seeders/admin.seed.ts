import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow';

async function createAdmin() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;
  const users = db.collection('users');

  const existing = await users.findOne({ email: 'admin@gmail.com' });
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  if (existing) {
    await users.updateOne(
      { email: 'admin@gmail.com' },
      { $set: { role: 'admin', isVerified: true, isActive: true, passwordHash } }
    );
    console.log('Admin user already existed — updated role and reset password.');
  } else {
    const passwordHash = await bcrypt.hash('Admin@123', 12);
    await users.insertOne({
      name: 'Admin',
      email: 'admin@gmail.com',
      passwordHash,
      role: 'admin',
      isVerified: true,
      isActive: true,
      isBanned: false,
      oauthProviders: [],
      notifications: { email: true, push: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Admin user created successfully.');
  }

  console.log('Email   : admin@gmail.com');
  console.log('Password: Admin@123');
  await mongoose.disconnect();
}

createAdmin().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
