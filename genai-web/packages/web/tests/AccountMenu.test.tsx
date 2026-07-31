import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { AccountMenu } from '@/components/ui/AccountMenu';

describe('AccountMenu Component', () => {
  it('renders default "アカウント" label when userDisplayName is empty or undefined', () => {
    render(
      <MemoryRouter>
        <AccountMenu
          isShowTeamManagementMenu={false}
          onClickSignout={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole('button').textContent).toContain('アカウント');
  });

  it('renders userDisplayName when provided', () => {
    render(
      <MemoryRouter>
        <AccountMenu
          isShowTeamManagementMenu={false}
          onClickSignout={vi.fn()}
          userDisplayName="テスト太郎"
        />
      </MemoryRouter>
    );
    expect(screen.getByRole('button').textContent).toContain('テスト太郎');
  });
});
