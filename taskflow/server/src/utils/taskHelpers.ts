import { Task } from '../models/Task';

export const populateTask = (query: ReturnType<typeof Task.findById | typeof Task.findOne>) =>
  query
    .populate('clientId', 'name avatar email phone')
    .populate('taskerId', 'name avatar email phone')
    .populate('categoryId', 'name slug icon');
