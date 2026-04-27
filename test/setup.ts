/**
 * Test setup file
 * Configures the test environment before running tests
 */

// Load test environment variables
import 'dotenv/config';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods if needed (optional - can be removed if you want to see logs)
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
// };
