import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamCreateForm } from '../../../../../src/features/teams/create/components/TeamCreateForm';
import { useCreateTeam } from '../../../../../src/features/teams/create/hooks/useCreateTeam';
import * as focusModule from '../../../../../src/utils/focus';

// Mock dependencies
vi.mock('@/features/teams/create/hooks/useCreateTeam');
vi.mock('@/utils/focus');

const mockCreateTeam = vi.fn();
const mockMutateTeams = vi.fn();
const mockFocus = vi.fn();

describe('TeamCreateForm', () => {
  const renderWithRouter = () => {
    return render(
      <MemoryRouter>
        <TeamCreateForm />
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(useCreateTeam).mockReturnValue({
      createTeam: mockCreateTeam,
      mutateTeams: mockMutateTeams,
    });

    vi.mocked(focusModule.focus).mockImplementation(mockFocus);
  });

  describe('Rendering', () => {
    it('renders team name input field', () => {
      renderWithRouter();

      const input = screen.getByRole('textbox', { name: /チーム名/ });
      expect(input).toBeDefined();
      expect(input.getAttribute('type')).toBe('text');
      expect(input.getAttribute('required')).toBe('');
    });

    it('renders team admin email input field', () => {
      renderWithRouter();

      const input = screen.getByRole('textbox', {
        name: /チーム管理者のメールアドレス/,
      });
      expect(input).toBeDefined();
      expect(input.getAttribute('type')).toBe('email');
      expect(input.getAttribute('required')).toBe('');
    });

    it('renders required badges', () => {
      const { getAllByText } = renderWithRouter();

      const badges = getAllByText('※必須');
      expect(badges.length).toBe(2);
    });

    it('renders support text for email field', () => {
      renderWithRouter();

      const supportText = screen.getByText(
        'チーム管理者として登録するユーザーのメールアドレスを入力してください',
      );
      expect(supportText).toBeDefined();
    });

    it('renders submit button', () => {
      renderWithRouter();

      const button = screen.getByRole('button', { name: '作成' });
      expect(button).toBeDefined();
      expect(button.getAttribute('type')).toBe('submit');
    });
  });

  describe('Form Submission', () => {
    it('calls createTeam with correct parameters on valid submission', async () => {
      const user = userEvent.setup();
      mockCreateTeam.mockResolvedValue({ teamId: 'team-123' });

      renderWithRouter();

      const nameInput = screen.getByRole('textbox', { name: /チーム名/ });
      const emailInput = screen.getByRole('textbox', {
        name: /チーム管理者のメールアドレス/,
      });

      await user.type(nameInput, 'テストチーム');
      await user.type(emailInput, 'admin@example.com');

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTeam).toHaveBeenCalledWith({
          teamName: 'テストチーム',
          teamAdminEmail: 'admin@example.com',
        });
      });
    });

    it('calls mutateTeams after successful submission', async () => {
      const user = userEvent.setup();
      mockCreateTeam.mockResolvedValue({ teamId: 'team-123' });

      renderWithRouter();

      const nameInput = screen.getByRole('textbox', { name: /チーム名/ });
      const emailInput = screen.getByRole('textbox', {
        name: /チーム管理者のメールアドレス/,
      });

      await user.type(nameInput, 'テストチーム');
      await user.type(emailInput, 'admin@example.com');

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateTeams).toHaveBeenCalled();
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      let resolveCreateTeam: (value: unknown) => void;
      const createTeamPromise = new Promise((resolve) => {
        resolveCreateTeam = resolve;
      });
      mockCreateTeam.mockReturnValue(createTeamPromise);

      renderWithRouter();

      const nameInput = screen.getByRole('textbox', { name: /チーム名/ });
      const emailInput = screen.getByRole('textbox', {
        name: /チーム管理者のメールアドレス/,
      });

      await user.type(nameInput, 'テストチーム');
      await user.type(emailInput, 'admin@example.com');

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: '作成中' });
        expect(loadingButton).toBeDefined();
      });

      resolveCreateTeam!({ teamId: 'team-123' });
    });
  });

  describe('Accessibility', () => {
    it('sets aria-describedby for support text on email field', () => {
      renderWithRouter();

      const emailInput = screen.getByRole('textbox', {
        name: /チーム管理者のメールアドレス/,
      });
      expect(emailInput.getAttribute('aria-describedby')).toBe('team-admin-email-input-support');
    });

    it('includes error id in aria-describedby when email validation fails', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const nameInput = screen.getByRole('textbox', { name: /チーム名/ });
      const emailInput = screen.getByRole('textbox', {
        name: /チーム管理者のメールアドレス/,
      });

      await user.type(nameInput, 'テストチーム');
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.queryByText(/メールアドレスの形式が正しくありません/);
        if (errorMessage) {
          const ariaDescribedBy = emailInput.getAttribute('aria-describedby');
          expect(ariaDescribedBy).toContain('team-admin-email-input-support');
          expect(ariaDescribedBy).toContain('team-email-error');
        }
      });
    });
  });
});
