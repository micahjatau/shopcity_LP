import '@testing-library/jest-dom';
import axe from 'axe-core';

beforeAll(() => {
  (globalThis as typeof globalThis & { axe?: typeof axe }).axe = axe;
});
