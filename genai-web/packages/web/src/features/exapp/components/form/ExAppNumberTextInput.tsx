import { FieldValues, UseFormRegister } from 'react-hook-form';
import { ErrorText } from '@/components/ui/dads/ErrorText';
import { Input } from '@/components/ui/dads/Input';
import { Label } from '@/components/ui/dads/Label';
import { RequirementBadge } from '@/components/ui/dads/RequirementBadge';
import { SupportText } from '@/components/ui/dads/SupportText';
import { GovAIFormUINumber } from '../../types';

type Props = {
  id: string;
  classNames?: string;
  errors?: string;
  uiConfig: GovAIFormUINumber;
  register: UseFormRegister<FieldValues>;
};

export const ExAppNumberTextInput = (props: Props) => {
  const { id, classNames, errors, uiConfig, register } = props;

  return (
    <div className={`flex flex-col gap-1.5 ${classNames ?? ''}`}>
      <Label htmlFor={id} size='lg'>
        {uiConfig.title} {uiConfig.required ? <RequirementBadge>※必須</RequirementBadge> : null}
      </Label>
      {uiConfig.desc && (
        <SupportText id={`${id}-support-text`} className='whitespace-pre-wrap'>
          {uiConfig.desc}
        </SupportText>
      )}
      <Input
        id={id}
        required={uiConfig.required ?? false}
        type='text'
        pattern='^([1-9]\d*|0)(\.\d+)?$'
        inputMode='decimal'
        isError={errors ? true : false}
        className='w-fit'
        aria-describedby={
          [uiConfig.desc && `${id}-support-text`, errors && `${id}-error-text`]
            .filter(Boolean)
            .join(' ') || undefined
        }
        {...register(id, {
          required: uiConfig.required ?? false,
          min: uiConfig.min ?? undefined,
          max: uiConfig.max ?? undefined,
        })}
      />
      {errors && <ErrorText id={`${id}-error-text`}>＊{errors}</ErrorText>}
    </div>
  );
};
