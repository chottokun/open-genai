import { ExApp, InvokeExAppHistory } from 'genai-web';
import { useEffect, useState } from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import { useSWRConfig } from 'swr';
import { unstable_serialize } from 'swr/infinite';
import { Button } from '@/components/ui/dads/Button';
import { Disclosure, DisclosureSummary } from '@/components/ui/dads/Disclosure';
import { ErrorText } from '@/components/ui/dads/ErrorText';
import { isJSON } from '@/utils/isJSON';
import { useExAppInvokeState } from '../hooks/useExAppInvokeState';
import { getExAppHistoriesKey } from '../hooks/useFetchInvokedExAppHistories';
import { ConversationHistory, GovAIFormDefaultValue, GovAIFormUIJson } from '../types';
import { buildPayload } from '../utils/buildPayload';
import { formatConversationHistory } from '../utils/formatConversationHistory';
import { formatFileInfo } from '../utils/formatFileInfo';
import { processFormFiles } from '../utils/processFormFiles';
import { transformFormData } from '../utils/transformFormData';
import { validatePayloadSize } from '../utils/validatePayloadSize';
import { ExAppFormComponentBuilder } from './ExAppFormComponentBuilder';
import { SystemPrompt } from './SystemPrompt';

type Props = {
  exApp: ExApp;
  uiJson: GovAIFormUIJson;
  defaultValues: GovAIFormDefaultValue;
};

export const ExAppForm = (props: Props) => {
  const { exApp, uiJson, defaultValues } = props;

  const {
    requestLoading,
    setRequestLoading,
    setError: setInvokeError,
    setExAppResponse,
    invokeRequest,
  } = useExAppInvokeState();
  const { mutate: mutateHistories } = useSWRConfig();

  const [validationError, setValidationError] = useState('');

  const systemPromptKey =
    exApp.systemPromptKeyName && exApp.systemPromptKeyName.length > 0
      ? exApp.systemPromptKeyName
      : 'system_prompt';

  const formValues = exApp.systemPrompt
    ? { ...defaultValues, [systemPromptKey]: exApp.systemPrompt }
    : defaultValues;

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    clearErrors,
    formState: { errors, submitCount },
  } = useForm({
    mode: 'onSubmit',
    values: formValues,
  });

  const [invokeHistory, setInvokeHistory] = useState<InvokeExAppHistory | null>(null);
  const [conversationHistory, setConversationHistory] = useState('');

  useEffect(() => {
    const history = localStorage.getItem('history');
    if (!history) {
      return;
    }
    try {
      const parsedHistory = JSON.parse(history);
      setInvokeHistory(parsedHistory);

      const historyInputs = `
${parsedHistory.inputs['conversation_histories'] ? formatConversationHistory(parsedHistory.inputs['conversation_histories'] as ConversationHistory[]) + '\n ## 入力' : '## 入力'}

${Object.keys(parsedHistory.inputs)
  .filter((key) => key !== 'conversation_histories')
  .map(
    (key) =>
      key +
      ': ' +
      (key === 'files' ? formatFileInfo(parsedHistory.inputs[key]) : parsedHistory.inputs[key]),
  )
  .join('\n')}

## 出力

${parsedHistory.outputs}

---

                `;

      setConversationHistory(historyInputs);
    } catch (e) {
      console.error(e);
    }

    localStorage.removeItem('history');
  }, []);

  const onSubmit = async (data: FieldValues) => {
    if (requestLoading) {
      return;
    }

    const transformedData = transformFormData(data, uiJson);

    const files = await processFormFiles(data);

    if (exApp.config) {
      const config = isJSON(exApp.config) ? JSON.parse(exApp.config) : {};
      if (
        config.max_payload_size &&
        !validatePayloadSize(config.max_payload_size, transformedData, files)
      ) {
        setValidationError(
          `アップロード可能なデータの合計サイズは${config.max_payload_size}までです。テキスト量やファイル数を見直してください。また、ファイルサイズについてはBase64エンコードされた後のサイズで計算されるため元のサイズより1.4倍大きくなります。`,
        );
        return;
      }
    }

    const payload = buildPayload({
      data: transformedData,
      files,
      invokeHistory,
      systemPromptKey: exApp.systemPromptKeyName,
    });

    try {
      setRequestLoading(true);
      setInvokeError(null);
      setExAppResponse(null);
      setValidationError('');

      await invokeRequest({
        teamId: exApp.teamId,
        exAppId: exApp.exAppId,
        inputs: payload,
        sessionId: invokeHistory?.sessionId ?? crypto.randomUUID(),
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        setInvokeError(error);
      }
    } finally {
      setRequestLoading(false);
      mutateHistories(unstable_serialize(getExAppHistoriesKey(exApp.teamId, exApp.exAppId)));
    }
  };

  return (
    <>
      <h2 className='sr-only'>AIアプリ入力フォーム</h2>
      <form className='flex flex-col gap-8' onSubmit={handleSubmit(onSubmit)}>
        <ExAppFormComponentBuilder
          uiJson={uiJson}
          register={register}
          setValue={setValue}
          trigger={trigger}
          clearErrors={clearErrors}
          errors={errors}
          submitCount={submitCount}
        />

        {exApp.systemPrompt && (
          <div className='flex flex-col gap-4'>
            <SystemPrompt exApp={exApp} register={register} errors={errors} />
          </div>
        )}

        {conversationHistory && (
          <div className='flex flex-col gap-4'>
            <Disclosure>
              <DisclosureSummary>会話履歴</DisclosureSummary>
              <pre className='mt-2 border border-transparent bg-solid-gray-50 px-3 text-dns-14N-130 leading-140 wrap-break-word whitespace-pre-wrap'>
                {conversationHistory}
              </pre>
            </Disclosure>
          </div>
        )}

        {validationError && <ErrorText>＊{validationError}</ErrorText>}

        <Button
          aria-disabled={requestLoading ? true : undefined}
          variant='solid-fill'
          size='lg'
          className='w-60 self-center'
          type='submit'
        >
          {requestLoading ? '実行中...' : '実行'}
        </Button>
      </form>
    </>
  );
};
