// Must run before any module imports so env.ts reads the right values
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = 'test_jwt_secret_32chars_minimum!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32chars_min!';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.PLATFORM_FEE_PERCENT = '20';

// MongoMemoryServer — use already-extracted local binary, skip network MD5 check
process.env.MONGOMS_SKIP_MD5_CHECK = 'true';
process.env.MONGOMS_SYSTEM_BINARY = '/home/abdullahmiraz/.cache/mongodb-binaries/mongod';
