import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Ember & Ash brand title', () => {
  render(<App />);
  const brandElements = screen.getAllByText(/Ember/i);
  expect(brandElements.length).toBeGreaterThan(0);
});
