import { render } from '@testing-library/react';
import { InvokeExAppHistory } from 'genai-web';
import { describe, expect, it } from 'vitest';
import { ExAppInvokeHistoryItemStatusLabel } from '../../../../src/features/exapp/components/ExAppInvokeHistoryItemStatusLabel';

describe('ExAppInvokeHistoryItemStatusLabel', () => {
  const testCases: Array<{ status: InvokeExAppHistory['status']; expectedText: string }> = [
    { status: 'ACCEPTED', expectedText: '受付済' },
    { status: 'IN_PROGRESS', expectedText: '処理中' },
    { status: 'COMPLETED', expectedText: '完了' },
    { status: 'ERROR', expectedText: 'エラー' },
  ];

  it.each(testCases)('renders $status status with text "$expectedText"', ({
    status,
    expectedText,
  }) => {
    const { getByText } = render(<ExAppInvokeHistoryItemStatusLabel status={status} />);

    const label = getByText(expectedText);
    const srOnlyText = getByText('ステータス：');

    expect(label).toBeDefined();
    expect(srOnlyText).toBeDefined();
  });

  it('renders nothing for unknown status', () => {
    const { container } = render(
      <ExAppInvokeHistoryItemStatusLabel status={'UNKNOWN' as InvokeExAppHistory['status']} />,
    );

    expect(container.firstChild).toBeNull();
  });
});
