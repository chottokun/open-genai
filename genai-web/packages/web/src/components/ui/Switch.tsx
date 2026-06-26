type Props = {
  className?: string;
  checked: boolean;
  onSwitch: (newValue: boolean) => void;
  label: string;
};

export const Switch = (props: Props) => {
  const { className, checked, onSwitch, label } = props;
  return (
    <div className={`${className ?? ''}`}>
      <label className='relative inline-flex cursor-pointer items-center gap-1.5 hover:underline'>
        <input
          type='checkbox'
          role='switch'
          value=''
          className='peer sr-only'
          checked={checked}
          onChange={() => {
            onSwitch(!checked);
          }}
        />
        <span
          className={`relative block h-7 w-12 rounded-[calc(infinity*1px)] border-2 border-transparent bg-solid-gray-420 peer-checked:bg-blue-900 peer-focus-visible:ring-[calc(2/16*1rem)] peer-focus-visible:ring-yellow-300 peer-focus-visible:outline-4 peer-focus-visible:outline-offset-[calc(2/16*1rem)] peer-focus-visible:outline-black peer-focus-visible:outline-solid before:m-0.5 before:block before:size-5 before:rounded-full before:bg-white before:transition-transform before:content-[''] peer-checked:before:translate-x-full after:absolute after:inset-x-0 after:-inset-y-full after:m-auto after:h-11 forced-colors:border-[ButtonBorder] forced-colors:peer-checked:border-[Highlight] forced-colors:peer-checked:bg-[Highlight] forced-colors:before:bg-[Highlight] forced-colors:peer-checked:before:bg-[Canvas]`}
        />
        <span className='text-oln-16N-100'>{label}</span>
      </label>
    </div>
  );
};
