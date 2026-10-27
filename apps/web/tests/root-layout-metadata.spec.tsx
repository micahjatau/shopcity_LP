jest.mock('../styles/globals.css', () => ({}));

import { metadata } from '../app/layout';

describe('root layout crawler metadata', () => {
  it('marks the internal app noindex and nofollow', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('does not describe the app as a scaffold', () => {
    expect(metadata.description).not.toMatch(/scaffold/i);
  });
});
