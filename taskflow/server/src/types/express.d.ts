import { IUser } from '../models/User';

declare global {
  namespace Express {
    // Merging IUser into passport's User interface eliminates all (as unknown as IUser) casts
    interface User extends IUser {}
    interface Request {
      user?: IUser;
    }
  }
}
