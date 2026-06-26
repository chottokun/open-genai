import { ExApp } from 'genai-web';
import { FieldErrors, FieldValues, UseFormRegister } from 'react-hook-form';
import { AutoResizeTextarea } from '@/components/ui/AutoResizeTextarea';
import { Disclosure, DisclosureSummary } from '@/components/ui/dads/Disclosure';
import { ErrorText } from '@/components/ui/dads/ErrorText';

type Props = {
  exApp: ExApp;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors<FieldValues>;
};

export const SystemPrompt = (props: Props) => {
  const { exApp, register, errors } = props;

  const key =
    exApp.systemPromptKeyName && exApp.systemPromptKeyName.length > 0
      ? exApp.systemPromptKeyName
      : 'system_prompt';

  return (
    <Disclosure>
      <DisclosureSummary id='system-prompt-input-label'>システムプロンプト</DisclosureSummary>
      <AutoResizeTextarea
        className='my-2'
        aria-labelledby='system-prompt-input-label'
        defaultValue={exApp.systemPrompt}
        {...register(key, {
          required: true,
        })}
      />
      {errors[key] && (
        <ErrorText id={`${key}-error-text`}>＊システムプロンプトは必須です。</ErrorText>
      )}
    </Disclosure>
  );
};
