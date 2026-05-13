import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongo: MongoMemoryServer;

export const connectDB = async (): Promise<void> => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
};

export const clearDB = async (): Promise<void> => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongo.stop();
};
