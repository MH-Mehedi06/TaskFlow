// No-op Bull mock — prevents Redis blocking connections during tests
const BullMock = jest.fn().mockImplementation(() => ({
  add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  process: jest.fn(),
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
  getJob: jest.fn().mockResolvedValue(null),
  getJobs: jest.fn().mockResolvedValue([]),
  pause: jest.fn().mockResolvedValue(undefined),
  resume: jest.fn().mockResolvedValue(undefined),
  empty: jest.fn().mockResolvedValue(undefined),
}));

export default BullMock;
module.exports = BullMock;
