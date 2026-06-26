import { FallbackProps } from 'react-error-boundary';
import { isApiError } from '@/lib/fetcher';
import { ErrorText } from './dads/ErrorText';

export const ErrorFallback = ({ error }: FallbackProps) => {
  const errorMessage = () => {
    if (isApiError(error)) {
      return (error.data as { error?: string })?.error ?? error.message;
    } else if (error instanceof Error) {
      return error.message;
    } else {
      return 'システムエラーが発生しました。しばらく時間をおいてから再度お試しください。';
    }
  };
  const message = errorMessage();

  return <ErrorText className='p-8'>{message}</ErrorText>;
};
