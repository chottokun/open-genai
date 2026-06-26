import { ReactNode } from 'react';

type Props = {
  className?: string;
  isActive?: boolean;
  onClick: () => void;
  children: ReactNode;
  label?: string;
};

export const SketchButton = (props: Props) => {
  return (
    <button
      type='button'
      title={props.label}
      className={`flex size-8 cursor-pointer items-center justify-center rounded-4 border hover:outline-black hover:outline-solid focus-visible:ring-[calc(2/16*1rem)] focus-visible:ring-yellow-300 focus-visible:outline-4 focus-visible:outline-offset-[calc(2/16*1rem)] focus-visible:outline-black focus-visible:outline-solid ${
        props.isActive ? 'border-solid-gray-800 bg-gray-200' : 'border-solid-gray-420'
      } ${props.className ?? ''}`}
      onClick={props.onClick}
      aria-pressed={props.isActive}
    >
      {props.children}
    </button>
  );
};
