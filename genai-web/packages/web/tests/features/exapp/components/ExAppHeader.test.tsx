import { render } from '@testing-library/react';
import { ExApp } from 'genai-web';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ExAppHeader } from '../../../../src/features/exapp/components/ExAppHeader';

describe('ExAppHeader', () => {
  const mockExApp: ExApp = {
    teamId: 'team-123',
    exAppId: 'app-123',
    exAppName: 'テストアプリ',
    endpoint: 'https://example.com/api',
    placeholder: '{}',
    description: 'テストアプリの説明',
    howToUse: '## 使い方\n\nこれはテストアプリの使い方です。',
    apiKey: 'test-api-key',
    createdDate: '2025-01-01',
    updatedDate: '2025-01-01',
  };

  it('renders exAppName as h1', () => {
    const { getByRole } = render(<MemoryRouter><ExAppHeader exApp={mockExApp} /></MemoryRouter>);

    const heading = getByRole('heading', { level: 1 });
    expect(heading).toBeDefined();
    expect(heading.textContent).toBe('テストアプリ');
  });

  it('renders howToUse markdown content', () => {
    const { getByText } = render(<MemoryRouter><ExAppHeader exApp={mockExApp} /></MemoryRouter>);

    expect(getByText(/これはテストアプリの使い方です。/)).toBeDefined();
  });

  it('does not render howToUse when empty string', () => {
    const exAppWithoutHowToUse = { ...mockExApp, howToUse: '' };
    const { queryByText } = render(<MemoryRouter><ExAppHeader exApp={exAppWithoutHowToUse} /></MemoryRouter>);

    expect(queryByText(/これはテストアプリの使い方です。/)).toBeNull();
  });
});
