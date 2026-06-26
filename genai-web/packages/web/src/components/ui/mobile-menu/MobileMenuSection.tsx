import { type ReactNode, useState } from 'react';
import { ArrowDownIcon } from '@/components/ui/icons/ArrowDownIcon';

type Props = {
  label: string;
  icon: (isOpen: boolean) => ReactNode;
  children: ReactNode;
};

export const MobileMenuSection = (props: Props) => {
  const { label, icon, children } = props;
  const [isOpen, setIsOpen] = useState(true);

  return (
    <details
      className='group/accordion py-1 pr-2 pl-4'
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
      open={isOpen}
    >
      <summary
        className={`flex min-h-11 items-center gap-2 py-1 pr-2 pl-4 hover:bg-solid-gray-50 hover:underline hover:underline-offset-[calc(3/16*1rem)] focus-visible:bg-yellow-300 focus-visible:ring-[calc(2/16*1rem)] focus-visible:ring-yellow-300 focus-visible:outline-4 focus-visible:outline-offset-0 focus-visible:outline-black focus-visible:outline-solid focus-visible:ring-inset marker:[content:''] [&::-webkit-details-marker]:hidden`}
      >
        {icon(isOpen)}
        {label}
        <ArrowDownIcon className='ml-auto shrink-0 group-open/accordion:rotate-180' />
      </summary>
      <div className='pl-8'>{children}</div>
    </details>
  );
};
