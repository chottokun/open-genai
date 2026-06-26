import { FieldValues, UseFormRegister } from 'react-hook-form';
import { Checkbox } from '@/components/ui/dads/Checkbox';
import { ErrorText } from '@/components/ui/dads/ErrorText';
import { Legend } from '@/components/ui/dads/Legend';
import { RequirementBadge } from '@/components/ui/dads/RequirementBadge';
import { SupportText } from '@/components/ui/dads/SupportText';
import { GovAIFormUICheckbox } from '../../types';

type Props = {
  id: string;
  classNames?: string;
  errors?: string;
  uiConfig: GovAIFormUICheckbox;
  register: UseFormRegister<FieldValues>;
};

export const ExAppCheckbox = (props: Props) => {
  const { id, classNames, errors, uiConfig, register } = props;

  return (
    <fieldset className={`${classNames ?? ''}`}>
      <Legend>
        {uiConfig.title} {uiConfig.required ? <RequirementBadge>※必須</RequirementBadge> : null}
      </Legend>
      {uiConfig.desc && (
        <SupportText id={`${id}-support-text`} className='my-1.5 whitespace-pre-wrap'>
          {uiConfig.desc}
        </SupportText>
      )}
      <div className='flex flex-col'>
        {uiConfig.items?.map((i) => {
          return (
            <Checkbox
              key={`${id}-${i.value}`}
              isError={errors ? true : false}
              value={i.value}
              aria-describedby={
                [uiConfig.desc && `${id}-support-text`, errors && `${id}-error-text`]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              {...register(id, {
                required: uiConfig.required ?? false,
              })}
            >
              {i.title}
            </Checkbox>
          );
        })}
      </div>
      {errors && (
        <ErrorText className='mt-2' id={`${id}-error-text`}>
          ＊{errors}
        </ErrorText>
      )}
    </fieldset>
  );
};
