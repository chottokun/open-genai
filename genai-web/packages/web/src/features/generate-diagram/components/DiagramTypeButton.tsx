import { createElement } from 'react';
import { Radio } from '@/components/ui/dads/Radio';
import { DiagramInfo, DiagramType } from '../types';

type Props = {
  option: DiagramInfo;
  isSelected: boolean;
  onChange: (id: DiagramType) => void;
  hasError: boolean;
};

export const DiagramTypeButton = (props: Props) => {
  const { option, isSelected, onChange, hasError } = props;

  return (
    <label
      className={`row-span-4 grid grid-rows-subgrid gap-1 rounded-8 border border-solid-gray-420 px-2 pt-2 pb-4 hover:border-transparent hover:bg-solid-gray-50 hover:outline-2 hover:outline-black hover:outline-solid lg:px-4 ${isSelected ? 'bg-blue-50!' : 'bg-white'}`}
    >
      <span className='lg:-ml-2'>
        <Radio
          aria-describedby={hasError ? 'type-input-error' : undefined}
          type='radio'
          name='diagram'
          checked={isSelected}
          onChange={() => onChange(option.id)}
        />
      </span>

      <span className='my-1 text-2xl'>
        {createElement(option.icon, {
          size: '1.5rem',
          'aria-hidden': true,
          className: 'mx-auto text-solid-gray-900',
        })}
      </span>
      <span className='text-dns-16B-130 text-pretty text-solid-gray-900'>{option.title}</span>
      <span className='text-dns-14N-130 text-pretty text-solid-gray-800'>{option.description}</span>
    </label>
  );
};
