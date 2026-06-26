import type { ReactNode } from 'react';
import { NotificationBannerIcon } from './parts/Icon';
import { bannerStyleClasses, bannerTypeClasses } from './styles';
import type {
  NotificationBannerHeadingLevel,
  NotificationBannerStyle,
  NotificationBannerType,
} from './types';

type Props = {
  className?: string;
  children: ReactNode;
  bannerStyle: NotificationBannerStyle;
  type: NotificationBannerType;
  title: string;
  headingLevel?: NotificationBannerHeadingLevel;
};

export const NotificationBanner = (props: Props) => {
  const { className, children, bannerStyle, type, title, headingLevel } = props;
  const Tag = headingLevel ?? 'div';

  return (
    <div
      className={`grid grid-cols-[var(--icon-size)_1fr_minmax(0,auto)] grid-rows-[minmax(calc(36/16*1rem),auto)] gap-4 border-current px-4 pt-2 pb-6 [--icon-size:calc(24/16*1rem)] desktop:gap-x-6 desktop:px-6 desktop:pt-6 desktop:pb-8 desktop:[--icon-size:calc(36/16*1rem)] ${bannerStyleClasses} ${bannerTypeClasses} ${className ?? ''}`}
      data-type={type}
      data-style={bannerStyle}
    >
      <Tag className={`col-span-2 grid grid-cols-[inherit] gap-[inherit]`}>
        <NotificationBannerIcon
          className='mt-[calc(3/16*1rem)] size-7 max-h-none max-w-none justify-self-center desktop:-my-1 desktop:size-11'
          type={type}
        />
        <span className='pt-[calc(3/16*1rem)] text-std-17B-170 text-solid-gray-900 desktop:pt-0.5 desktop:text-std-20B-150'>
          {title}
        </span>
      </Tag>
      {children}
    </div>
  );
};
