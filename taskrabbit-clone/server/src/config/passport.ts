import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';
import { TaskerProfile } from '../models/TaskerProfile';
import { env } from './env';
import { redis } from './redis';

const USER_CACHE_TTL = 300; // 5 minutes

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.JWT_SECRET,
    },
    async (payload, done) => {
      try {
        const cacheKey = `user:${payload.sub}`;
        const cached = await redis.get(cacheKey).catch(() => null);
        if (cached) {
          const user = JSON.parse(cached);
          if (!user.isActive) return done(null, false);
          return done(null, user);
        }
        const user = await User.findById(payload.sub).select('-passwordHash').lean();
        if (!user || !user.isActive) return done(null, false);
        redis.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(user)).catch(() => {});
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${env.CLIENT_URL.replace('5173', '5000')}/api/auth/google/callback`,
        passReqToCallback: true,
      },
      async (req, _accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google'), false);

          let user = await User.findOne({
            $or: [{ email }, { 'oauthProviders.providerId': profile.id }],
          });

          if (!user) {
            const role = (req.query.role as string) === 'tasker' ? 'tasker' : 'client';
            user = await User.create({
              name: profile.displayName,
              email,
              avatar: profile.photos?.[0]?.value,
              isVerified: true,
              role,
              oauthProviders: [{ provider: 'google', providerId: profile.id }],
            });
            if (role === 'tasker') {
              await TaskerProfile.create({ userId: user._id });
            }
          } else {
            const hasGoogle = user.oauthProviders.some((p) => p.providerId === profile.id);
            if (!hasGoogle) {
              user.oauthProviders.push({ provider: 'google', providerId: profile.id });
              await user.save();
            }
          }

          return done(null, user);
        } catch (err) {
          return done(err as Error, false);
        }
      }
    )
  );
}

export default passport;
