import { render, screen, waitFor } from '@testing-library/react';

jest.mock('../lib/browser/offline-earn-queue', () => ({
  getOfflineEarnRecordCount: jest.fn().mockRejectedValue(new Error('no storage')),
  subscribeOfflineQueue: jest.fn(() => () => undefined),
}));

import { SyncQueueIndicator } from '../components/offline';

describe('offline queue indicators', () => {
  it('surfaces queue storage failures explicitly', async () => {
    render(<SyncQueueIndicator />);

    await waitFor(() => {
      expect(screen.getByText(/offline queue unavailable/i)).toBeInTheDocument();
    });
  });
});
