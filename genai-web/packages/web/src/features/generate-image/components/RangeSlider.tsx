import { Input } from '@/components/ui/dads/Input';
import { Label, type LabelSize } from '@/components/ui/dads/Label';
import { SupportText } from '@/components/ui/dads/SupportText';

type Props = {
  className?: string;
  id: string;
  label?: string;
  labelSize?: LabelSize;
  helpTextClass?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  help?: string;
  onChange: (n: number) => void;
};

export const RangeSlider = (props: Props) => {
  return (
    <div className={`${props.className ?? ''}`}>
      <div className='flex flex-col gap-1'>
        {props.label && (
          <div className='flex items-center'>
            <Label size={props.labelSize ?? 'sm'} id={`${props.id}-label`} htmlFor={props.id}>
              {props.label}
            </Label>
          </div>
        )}
        {props.help && (
          <SupportText className={props.helpTextClass} id={`${props.id}-support`}>
            {props.help}
          </SupportText>
        )}
        <Input
          blockSize='sm'
          className='my-1 self-start'
          type='number'
          id={props.id}
          aria-describedby={`${props.id}-support`}
          min={props.min}
          max={props.max}
          step={props.step}
          value={props.value}
          onChange={(e) => {
            const parsed = Number.parseFloat(e.target.value);
            if (!Number.isNaN(parsed)) {
              props.onChange(parsed);
            }
          }}
        />
      </div>
      <div className='mt-2 flex'>
        <input
          type='range'
          aria-labelledby={`${props.id}-label`}
          aria-describedby={`${props.id}-support`}
          className='mb-6 h-1 w-full cursor-pointer'
          value={props.value}
          min={props.min}
          max={props.max}
          step={props.step}
          onChange={(e) => {
            props.onChange(Number.parseFloat(e.target.value));
          }}
        />
      </div>
    </div>
  );
};
