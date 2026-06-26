import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamAppCreateForm } from '../../../../../src/features/team-apps/create/components/TeamAppCreateForm';
import { useCreateTeamApp } from '../../../../../src/features/team-apps/create/hooks/useCreateTeamApp';
import { teamAppCreateSchema } from '../../../../../src/features/team-apps/create/schema';
import { ApiError } from '../../../../../src/lib/fetcher';
import * as focusModule from '../../../../../src/utils/focus';

// Mock dependencies
vi.mock('@/features/team-apps/create/hooks/useCreateTeamApp');
vi.mock('@/utils/focus');

const mockCreateTeamApp = vi.fn();
const mockMutateTeamApps = vi.fn();
const mockFocus = vi.fn();
const mockNavigate = vi.fn();

// Mock useNavigate
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Helper to fill input without userEvent special character parsing issues
const fillInput = (element: HTMLElement, value: string) => {
  fireEvent.change(element, { target: { value } });
};

describe('TeamAppCreateForm', () => {
  const renderWithRouter = (teamId = 'team-1') => {
    return render(
      <MemoryRouter initialEntries={[`/teams/${teamId}/apps/create`]}>
        <Routes>
          <Route path='/teams/:teamId/apps/create' element={<TeamAppCreateForm />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(useCreateTeamApp).mockReturnValue({
      createTeamApp: mockCreateTeamApp,
      mutateTeamApps: mockMutateTeamApps,
    });

    vi.mocked(focusModule.focus).mockImplementation(mockFocus);
  });

  describe('Rendering', () => {
    it('renders name input field', () => {
      renderWithRouter();

      const input = screen.getByRole('textbox', { name: /名前/ });
      expect(input).toBeDefined();
      expect(input.getAttribute('required')).toBe('');
    });

    it('renders description input field', () => {
      renderWithRouter();

      const input = screen.getByRole('textbox', { name: /概要/ });
      expect(input).toBeDefined();
      expect(input.getAttribute('required')).toBe('');
    });

    it('renders how to use textarea', () => {
      renderWithRouter();

      const textarea = screen.getByRole('textbox', { name: /使い方/ });
      expect(textarea).toBeDefined();
      expect(textarea.getAttribute('required')).toBe('');
    });

    it('renders endpoint input field', () => {
      renderWithRouter();

      const input = screen.getByRole('textbox', { name: /APIエンドポイントのURL/ });
      expect(input).toBeDefined();
      expect(input.getAttribute('type')).toBe('url');
      expect(input.getAttribute('required')).toBe('');
    });

    it('renders API key input field', () => {
      renderWithRouter();

      const input = screen.getByRole('textbox', { name: /APIキー/ });
      expect(input).toBeDefined();
      expect(input.getAttribute('required')).toBe('');
    });

    it('renders UI format textarea', () => {
      renderWithRouter();

      const textarea = screen.getByRole('textbox', { name: /APIリクエストのデータ形式/ });
      expect(textarea).toBeDefined();
      expect(textarea.getAttribute('required')).toBe('');
    });

    it('renders config textarea', () => {
      renderWithRouter();

      const textarea = screen.getByRole('textbox', { name: /コンフィグ/ });
      expect(textarea).toBeDefined();
    });

    it('renders system prompt textarea', () => {
      renderWithRouter();

      const systemPromptTextarea = screen.getByRole('textbox', {
        name: (name, element) =>
          /システムプロンプト/.test(name) && element.id === 'team-app-system-prompt',
      });
      expect(systemPromptTextarea).toBeDefined();
    });

    it('renders system prompt key input with default value', () => {
      renderWithRouter();

      const systemPromptKeyInput = screen.getByRole('textbox', {
        name: /システムプロンプトのキー名/,
      }) as HTMLInputElement;
      expect(systemPromptKeyInput).toBeDefined();
      expect(systemPromptKeyInput.value).toBe('systemPrompt');
    });

    it('renders status select', () => {
      renderWithRouter();

      const select = screen.getByRole('combobox', { name: /ステータス/ });
      expect(select).toBeDefined();
    });

    it('renders copyable checkbox', () => {
      renderWithRouter();

      const checkbox = screen.getByRole('checkbox', { name: /コピー可能にする/ });
      expect(checkbox).toBeDefined();
    });

    it('renders submit button', () => {
      renderWithRouter();

      const button = screen.getByRole('button', { name: '作成' });
      expect(button).toBeDefined();
      expect(button.getAttribute('type')).toBe('submit');
    });
  });

  describe('Form Submission', () => {
    const fillRequiredFields = async (user: ReturnType<typeof userEvent.setup>) => {
      const nameInput = screen.getByRole('textbox', { name: /名前/ });
      await user.type(nameInput, 'テストアプリ');

      const descriptionInput = screen.getByRole('textbox', { name: /概要/ });
      await user.type(descriptionInput, 'テストアプリの概要');

      const howToUseInput = screen.getByRole('textbox', { name: /使い方/ });
      await user.type(howToUseInput, 'テストアプリの使い方');

      const endpointInput = screen.getByRole('textbox', { name: /APIエンドポイントのURL/ });
      await user.type(endpointInput, 'https://api.example.com/test');

      const apiKeyInput = screen.getByRole('textbox', { name: /APIキー/ });
      await user.type(apiKeyInput, 'test-api-key-123');

      const uiFormatInput = screen.getByRole('textbox', { name: /APIリクエストのデータ形式/ });
      // Use fireEvent to avoid userEvent special character parsing issues with {}
      fillInput(uiFormatInput, '{"input": "value"}');

      const statusSelect = screen.getByRole('combobox', { name: /ステータス/ });
      await user.selectOptions(statusSelect, 'published');
    };

    it('calls createTeamApp with correct parameters on valid submission', async () => {
      const user = userEvent.setup();
      mockCreateTeamApp.mockResolvedValue({
        exAppId: 'app-1',
        exAppName: 'テストアプリ',
      });

      renderWithRouter('team-123');

      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTeamApp).toHaveBeenCalledWith('team-123', {
          exAppName: 'テストアプリ',
          endpoint: 'https://api.example.com/test',
          config: expect.stringContaining('max_payload_size'),
          placeholder: '{"input": "value"}',
          systemPrompt: '',
          systemPromptKeyName: 'systemPrompt',
          description: 'テストアプリの概要',
          howToUse: 'テストアプリの使い方',
          apiKey: 'test-api-key-123',
          copyable: false,
          status: 'published',
        });
      });
    });

    it('calls mutateTeamApps after successful submission', async () => {
      const user = userEvent.setup();
      mockCreateTeamApp.mockResolvedValue({
        exAppId: 'app-1',
        exAppName: 'テストアプリ',
      });

      renderWithRouter();

      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateTeamApps).toHaveBeenCalled();
      });
    });

    it('navigates to apps page after successful submission', async () => {
      const user = userEvent.setup();
      mockCreateTeamApp.mockResolvedValue({
        exAppId: 'app-1',
        exAppName: 'テストアプリ',
      });

      renderWithRouter('team-456');

      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/teams/team-456/apps');
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      let resolveCreateTeamApp: (value: unknown) => void;
      const createTeamAppPromise = new Promise((resolve) => {
        resolveCreateTeamApp = resolve;
      });
      mockCreateTeamApp.mockReturnValue(createTeamAppPromise);

      renderWithRouter();

      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: '作成中' });
        expect(loadingButton).toBeDefined();
      });

      resolveCreateTeamApp!({
        exAppId: 'app-1',
        exAppName: 'テストアプリ',
      });
    });

    it('includes copyable as true when checkbox is checked', async () => {
      const user = userEvent.setup();
      mockCreateTeamApp.mockResolvedValue({
        exAppId: 'app-1',
        exAppName: 'テストアプリ',
      });

      renderWithRouter();

      await fillRequiredFields(user);

      const copyableCheckbox = screen.getByRole('checkbox', { name: /コピー可能にする/ });
      await user.click(copyableCheckbox);

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTeamApp).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            copyable: true,
          }),
        );
      });
    });

    it('includes system prompt values when filled', async () => {
      const user = userEvent.setup();
      mockCreateTeamApp.mockResolvedValue({
        exAppId: 'app-1',
        exAppName: 'テストアプリ',
      });

      renderWithRouter();

      await fillRequiredFields(user);

      const systemPromptTextarea = screen.getByRole('textbox', {
        name: (name, element) =>
          /システムプロンプト/.test(name) && element.id === 'team-app-system-prompt',
      });
      await user.type(systemPromptTextarea, 'You are a helpful assistant.');

      const systemPromptKeyInput = screen.getByRole('textbox', {
        name: /システムプロンプトのキー名/,
      });
      await user.clear(systemPromptKeyInput);
      await user.type(systemPromptKeyInput, 'system_prompt');

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTeamApp).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            systemPrompt: 'You are a helpful assistant.',
            systemPromptKeyName: 'system_prompt',
          }),
        );
      });
    });
  });

  describe('Validation', () => {
    it('validates name is required in schema', () => {
      // Test the schema directly since HTML5 validation interferes with testing empty fields
      const result = teamAppCreateSchema.safeParse({
        name: '',
        endpoint: 'https://example.com',
        uiFormat: '{}',
        description: 'test',
        howToUse: 'test',
        apiKey: 'key',
        copyable: false,
        status: 'published',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const nameError = result.error.issues.find((issue) => issue.path.includes('name'));
        expect(nameError?.message).toContain('AIアプリ名を入力してください');
      }
    });

    it('shows error message for invalid endpoint URL', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const nameInput = screen.getByRole('textbox', { name: /名前/ });
      await user.type(nameInput, 'テストアプリ');

      const descriptionInput = screen.getByRole('textbox', { name: /概要/ });
      await user.type(descriptionInput, 'テストアプリの概要');

      const howToUseInput = screen.getByRole('textbox', { name: /使い方/ });
      await user.type(howToUseInput, 'テストアプリの使い方');

      const endpointInput = screen.getByRole('textbox', { name: /APIエンドポイントのURL/ });
      // Use http instead of https to trigger schema validation error
      fillInput(endpointInput, 'http://invalid.example.com');

      const apiKeyInput = screen.getByRole('textbox', { name: /APIキー/ });
      await user.type(apiKeyInput, 'test-api-key');

      const uiFormatInput = screen.getByRole('textbox', { name: /APIリクエストのデータ形式/ });
      fillInput(uiFormatInput, '{"input": "value"}');

      const statusSelect = screen.getByRole('combobox', { name: /ステータス/ });
      await user.selectOptions(statusSelect, 'published');

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/URLの形式が正しくありません/);
        expect(errorMessage).toBeDefined();
      });
    });

    it('rejects endpoint URLs with credentials in schema', () => {
      const result = teamAppCreateSchema.safeParse({
        name: 'テストアプリ',
        endpoint: 'https://user:pass@example.com/test',
        uiFormat: '{}',
        description: 'test',
        howToUse: 'test',
        apiKey: 'key',
        copyable: false,
        status: 'published',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const endpointError = result.error.issues.find((issue) => issue.path.includes('endpoint'));
        expect(endpointError?.message).toContain('URLの形式が正しくありません');
      }
    });

    it('shows error message for invalid JSON in UI format', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const nameInput = screen.getByRole('textbox', { name: /名前/ });
      await user.type(nameInput, 'テストアプリ');

      const descriptionInput = screen.getByRole('textbox', { name: /概要/ });
      await user.type(descriptionInput, 'テストアプリの概要');

      const howToUseInput = screen.getByRole('textbox', { name: /使い方/ });
      await user.type(howToUseInput, 'テストアプリの使い方');

      const endpointInput = screen.getByRole('textbox', { name: /APIエンドポイントのURL/ });
      await user.type(endpointInput, 'https://api.example.com/test');

      const apiKeyInput = screen.getByRole('textbox', { name: /APIキー/ });
      await user.type(apiKeyInput, 'test-api-key');

      const uiFormatInput = screen.getByRole('textbox', { name: /APIリクエストのデータ形式/ });
      await user.type(uiFormatInput, 'invalid json');

      const statusSelect = screen.getByRole('combobox', { name: /ステータス/ });
      await user.selectOptions(statusSelect, 'published');

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/APIリクエストのデータ形式はJSON形式にしてください/);
        expect(errorMessage).toBeDefined();
      });
    });

    it('shows error message when status is not selected', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const nameInput = screen.getByRole('textbox', { name: /名前/ });
      await user.type(nameInput, 'テストアプリ');

      const descriptionInput = screen.getByRole('textbox', { name: /概要/ });
      await user.type(descriptionInput, 'テストアプリの概要');

      const howToUseInput = screen.getByRole('textbox', { name: /使い方/ });
      await user.type(howToUseInput, 'テストアプリの使い方');

      const endpointInput = screen.getByRole('textbox', { name: /APIエンドポイントのURL/ });
      await user.type(endpointInput, 'https://api.example.com/test');

      const apiKeyInput = screen.getByRole('textbox', { name: /APIキー/ });
      await user.type(apiKeyInput, 'test-api-key');

      const uiFormatInput = screen.getByRole('textbox', { name: /APIリクエストのデータ形式/ });
      fillInput(uiFormatInput, '{"input": "value"}');

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/ステータスを選択してください/);
        expect(errorMessage).toBeDefined();
      });
    });

    it('does not call createTeamApp on validation failure', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTeamApp).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    const fillRequiredFields = async (user: ReturnType<typeof userEvent.setup>) => {
      const nameInput = screen.getByRole('textbox', { name: /名前/ });
      await user.type(nameInput, 'テストアプリ');

      const descriptionInput = screen.getByRole('textbox', { name: /概要/ });
      await user.type(descriptionInput, 'テストアプリの概要');

      const howToUseInput = screen.getByRole('textbox', { name: /使い方/ });
      await user.type(howToUseInput, 'テストアプリの使い方');

      const endpointInput = screen.getByRole('textbox', { name: /APIエンドポイントのURL/ });
      await user.type(endpointInput, 'https://api.example.com/test');

      const apiKeyInput = screen.getByRole('textbox', { name: /APIキー/ });
      await user.type(apiKeyInput, 'test-api-key-123');

      const uiFormatInput = screen.getByRole('textbox', { name: /APIリクエストのデータ形式/ });
      fillInput(uiFormatInput, '{"input": "value"}');

      const statusSelect = screen.getByRole('combobox', { name: /ステータス/ });
      await user.selectOptions(statusSelect, 'published');
    };

    it('displays server error message on API error', async () => {
      const user = userEvent.setup();
      mockCreateTeamApp.mockRejectedValue(
        new ApiError(400, {
          error: 'このアプリ名は既に使用されています',
        }),
      );

      renderWithRouter();

      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText('このアプリ名は既に使用されています');
        expect(errorMessage).toBeDefined();
      });
    });

    it('displays generic error message on non-API error', async () => {
      const user = userEvent.setup();
      mockCreateTeamApp.mockRejectedValue(new Error('Unknown error'));

      renderWithRouter();

      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(
          'システムエラーが発生しました。ページをリロードして再度お試しください。',
        );
        expect(errorMessage).toBeDefined();
      });
    });

    it('calls focus on server-error heading when error occurs', async () => {
      const user = userEvent.setup();
      mockCreateTeamApp.mockRejectedValue(
        new ApiError(500, {
          error: 'サーバーエラー',
        }),
      );

      renderWithRouter();

      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFocus).toHaveBeenCalledWith('server-error');
      });
    });
  });

  describe('Accessibility', () => {
    it('has sr-only heading for server error section', async () => {
      const user = userEvent.setup();
      mockCreateTeamApp.mockRejectedValue(
        new ApiError(400, {
          error: 'エラー',
        }),
      );

      renderWithRouter();

      const nameInput = screen.getByRole('textbox', { name: /名前/ });
      await user.type(nameInput, 'テストアプリ');

      const descriptionInput = screen.getByRole('textbox', { name: /概要/ });
      await user.type(descriptionInput, 'テストアプリの概要');

      const howToUseInput = screen.getByRole('textbox', { name: /使い方/ });
      await user.type(howToUseInput, 'テストアプリの使い方');

      const endpointInput = screen.getByRole('textbox', { name: /APIエンドポイントのURL/ });
      await user.type(endpointInput, 'https://api.example.com/test');

      const apiKeyInput = screen.getByRole('textbox', { name: /APIキー/ });
      await user.type(apiKeyInput, 'test-api-key');

      const uiFormatInput = screen.getByRole('textbox', { name: /APIリクエストのデータ形式/ });
      fillInput(uiFormatInput, '{"input": "value"}');

      const statusSelect = screen.getByRole('combobox', { name: /ステータス/ });
      await user.selectOptions(statusSelect, 'published');

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: 'システムエラー' });
        expect(heading).toBeDefined();
        expect(heading.className).toContain('sr-only');
      });
    });

    it('renders required badges for mandatory fields', () => {
      renderWithRouter();

      const requiredBadges = screen.getAllByText('※必須');
      expect(requiredBadges.length).toBeGreaterThan(0);
    });

    it('renders optional badges for optional fields', () => {
      renderWithRouter();

      const optionalBadges = screen.getAllByText('※任意');
      expect(optionalBadges.length).toBeGreaterThan(0);
    });

    it('has support text for description field', () => {
      renderWithRouter();

      const supportText = screen.getByText(/一覧に表示する簡単な説明/);
      expect(supportText).toBeDefined();
    });

    it('has support text for how to use field', () => {
      renderWithRouter();

      const supportText = screen.getByText(/想定用途・入力例・仕組みなど/);
      expect(supportText).toBeDefined();
    });
  });
});
