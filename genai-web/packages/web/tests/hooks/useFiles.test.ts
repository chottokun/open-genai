import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFiles } from '../../src/hooks/useFiles';
import { FileLimit } from 'genai-web';

// Mock file-type
vi.mock('file-type', () => ({
  fileTypeFromStream: vi.fn().mockResolvedValue({ mime: 'application/pdf' }),
  fileTypeFromBuffer: vi.fn().mockResolvedValue({ mime: 'application/pdf' }),
}));

// Mock fileApi
vi.mock('@/lib/fileApi', () => ({
  getSignedUrl: vi.fn().mockResolvedValue({ data: 'http://localhost/files/signed-url' }),
  uploadFile: vi.fn().mockResolvedValue({}),
  getFileDownloadSignedUrl: vi.fn().mockResolvedValue('http://localhost/files/signed-url'),
  deleteUploadedFile: vi.fn().mockResolvedValue({}),
}));

describe('useFiles file extension case-insensitivity', () => {
  const fileLimit: FileLimit = {
    maxFileSizeMB: 10,
    maxImageFileSizeMB: 10,
    maxVideoFileSizeMB: 10,
    maxFileCount: 5,
    maxImageFileCount: 5,
    maxVideoFileCount: 5,
  };

  it('allows files with uppercase extensions like .PDF when accept list has .pdf', async () => {
    const { result } = renderHook(() => useFiles('test-chat-id'));

    // Create a mock File object with an uppercase extension
    const mockFile = new File(['dummy content'], 'document.PDF', { type: 'application/pdf' });

    // We act and upload the file with the mock file, file limits, and accepted formats list (containing '.pdf')
    await act(async () => {
      await result.current.uploadFiles([mockFile], fileLimit, ['.pdf']);
    });

    // Check that there are no validation error messages
    expect(result.current.errorMessages).toEqual([]);
    expect(result.current.uploadedFiles.length).toBe(1);
    expect(result.current.uploadedFiles[0].name).toBe('document.PDF');
    expect(result.current.uploadedFiles[0].errorMessages).toEqual([]);
  });

  it('correctly rejects files with extensions that are truly not allowed', async () => {
    const { result } = renderHook(() => useFiles('test-chat-id-2'));

    const mockFile = new File(['dummy content'], 'document.EXE', { type: 'application/octet-stream' });

    // Mock file-type return for exe
    const { fileTypeFromStream } = await import('file-type');
    vi.mocked(fileTypeFromStream).mockResolvedValueOnce({ mime: 'application/x-msdownload' });

    await act(async () => {
      await result.current.uploadFiles([mockFile], fileLimit, ['.pdf']);
    });

    expect(result.current.errorMessages.length).toBeGreaterThan(0);
    const hasForbiddenExtensionError = result.current.errorMessages.some(msg =>
      msg.includes('document.EXE は許可されていない拡張子です')
    );
    expect(hasForbiddenExtensionError).toBe(true);
  });
});
