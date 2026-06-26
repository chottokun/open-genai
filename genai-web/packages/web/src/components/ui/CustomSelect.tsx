import {
  Description,
  Field,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/react';
import { PiCheck } from 'react-icons/pi';
import type { SelectBlockSize } from '@/components/ui/dads/Select';
import { SupportTextStyles } from '@/components/ui/dads/SupportText';
import { ArrowDownIcon } from '@/components/ui/icons/ArrowDownIcon';

type SupportTextPosition = 'top' | 'bottom';
type Option = {
  value: string;
  label: string;
};

type Props = {
  className?: string;
  label?: string;
  labelClassName?: string;
  buttonClassName?: string;
  value: string;
  options: Option[];
  description?: string;
  isFullWidth?: boolean;
  isVertical?: boolean;
  selectSize?: SelectBlockSize;
  onChange: (value: string) => void;
};

// Determine the position of the support text for a select box.
// - Top: shown above the select box when vertical layout is used
// - Bottom: shown below the select box when horizontal layout is used
const getSupportTextPosition = (
  isVertical?: boolean,
  description?: string,
): SupportTextPosition | undefined => {
  if (!description) return undefined;
  return isVertical ? 'top' : 'bottom';
};

// Returns the display label of the selected option based on the given value.
// If no matching option is found, returns a fallback label.
const getSelectedValue = (options: Option[], value: string) => {
  const matchedOption = options.find((o) => o.value === value);
  return matchedOption?.label ?? '選択してください';
};

export const CustomSelect = (props: Props) => {
  const {
    className,
    label,
    labelClassName,
    buttonClassName,
    description,
    value,
    options,
    onChange,
    isVertical,
    isFullWidth,
    selectSize = 'sm',
  } = props;

  const supportTextPosition = getSupportTextPosition(isVertical, description);
  const selectedLabel = getSelectedValue(options, value);

  return (
    <Field className={`relative ${className ?? ''}`}>
      <div
        className={`flex ${isVertical ? 'flex-col gap-y-1.5' : 'flex-row items-center gap-x-0.5'}`}
      >
        {label && (
          <Label
            className={`flex w-fit items-center gap-2 text-solid-gray-800 ${labelClassName ?? ''}`}
          >
            {label}
          </Label>
        )}
        {supportTextPosition === 'top' && (
          <Description className={SupportTextStyles}>{description}</Description>
        )}
        <Listbox value={value} onChange={onChange}>
          <div className='relative'>
            <ListboxButton
              className={`group/button relative rounded-4 border border-solid-gray-600 bg-white pr-10 pl-3 text-left text-solid-gray-800 hover:border-black focus-visible:ring-[calc(2/16*1rem)] focus-visible:ring-yellow-300 focus-visible:outline-4 focus-visible:outline-offset-[calc(2/16*1rem)] focus-visible:outline-black focus-visible:outline-solid data-[select-size=lg]:h-14 data-[select-size=md]:h-12 data-[select-size=sm]:h-10 ${isFullWidth ? 'w-full' : 'w-fit'} ${buttonClassName ?? ''}`}
              data-select-size={selectSize}
            >
              <span className='block truncate'>{selectedLabel}</span>

              <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                <ArrowDownIcon
                  className='mt-0.5 group-data-open/button:rotate-180'
                  aria-hidden={true}
                />
              </span>
            </ListboxButton>
            <ListboxOptions
              className={`absolute z-10 mt-0.5 max-h-60 overflow-auto rounded-8 border border-solid-gray-420 bg-white py-1 text-dns-16N-130 shadow-1 focus:outline-hidden has-[>:nth-child(7)]:rounded-r-none ${isFullWidth ? 'w-full' : 'w-fit'}`}
            >
              {options.map((option, idx) => (
                // NOTE: The `focus` state of ListboxOptions in Headless UI v2 is same as `active` state.
                // Therefore we still cannot use the state as `data-[focus]` for focus-visible currently.
                <ListboxOption
                  key={`${option.value}-${idx}`}
                  className={({ focus }) =>
                    `relative h-9 py-2 pr-4 pl-10 text-solid-gray-800 select-none hover:bg-solid-gray-50 hover:underline hover:underline-offset-[calc(3/16*1rem)] data-selected:bg-blue-50! data-selected:text-blue-1000! ${focus ? '[:root[data-headlessui-focus-visible]_&]:bg-yellow-300 [:root[data-headlessui-focus-visible]_&]:ring-[calc(6/16*1rem)] [:root[data-headlessui-focus-visible]_&]:ring-yellow-300 [:root[data-headlessui-focus-visible]_&]:outline-4 [:root[data-headlessui-focus-visible]_&]:-outline-offset-4 [:root[data-headlessui-focus-visible]_&]:outline-black [:root[data-headlessui-focus-visible]_&]:outline-solid [:root[data-headlessui-focus-visible]_&]:ring-inset' : ''} `
                  }
                  value={option.value}
                >
                  {({ selected }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-700' : 'font-400'}`}>
                        {option.label}
                      </span>
                      {selected ? (
                        <span className='absolute inset-y-0 left-0 flex items-center pl-3 text-blue-1000'>
                          <PiCheck aria-hidden={true} className='size-5' />
                        </span>
                      ) : null}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </div>
        </Listbox>
      </div>
      {supportTextPosition === 'bottom' && (
        <Description className={`${SupportTextStyles} mt-1`}>{description}</Description>
      )}
    </Field>
  );
};
