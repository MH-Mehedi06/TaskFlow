import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageLoader } from '../components/PageLoader';

describe('PageLoader', () => {
  it('renders three animated dots', () => {
    const { container } = render(<PageLoader />);
    const dots = container.querySelectorAll('.animate-typing-dot');
    expect(dots).toHaveLength(3);
  });

  it('renders inside a full-screen centered container', () => {
    const { container } = render(<PageLoader />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('min-h-screen');
    expect(wrapper?.className).toContain('flex');
  });
});
