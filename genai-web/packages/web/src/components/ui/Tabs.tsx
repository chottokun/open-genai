import type { ReactNode } from 'react';
import { Link } from 'react-router';

type TabItem = {
  title: string;
  href: string;
  selected?: boolean;
  key?: string;
  icon?: ReactNode;
  content?: ReactNode;
};

type Props = {
  title: string;
  items: TabItem[];
};

export const Tabs = (props: Props) => {
  const { title, items } = props;

  const baseClassNames =
    'relative z-0 inline-flex gap-2 justify-center items-center text-oln-14B-100 px-4 py-6 group hover:bg-solid-gray-50 md:text-oln-16B-100 md:px-8 md:py-6 aria-[current=page]:cursor-default aria-[current=page]:bg-white';
  const selectedClassNames = `
    relative text-blue-900
    after:absolute after:bottom-0 after:left-0 after:w-full after:border-b-4 after:border-current`;
  const focusedClassNames =
    'focus-visible:z-10 focus-visible:rounded-4 focus-visible:bg-yellow-300 focus-visible:outline-4 focus-visible:outline-offset-[calc(2/16*1rem)] focus-visible:outline-black focus-visible:ring-[calc(2/16*1rem)] focus-visible:ring-yellow-300';

  return (
    <nav aria-label={`${title}の目次`} className='pb-3'>
      <div className='-mx-1.5 mt-4 w-full overflow-x-auto p-1.5'>
        <ul className='flex w-full min-w-max items-end whitespace-nowrap border-b border-solid-gray-420'>
          {items.map((item) => (
            <li key={`tab-${item.title}`}>
              {item.selected ? (
                <span aria-current='page' className={`${baseClassNames} ${selectedClassNames}`}>
                  {item.icon}
                  {item.title}
                </span>
              ) : (
                <Link className={`${baseClassNames} ${focusedClassNames}`} to={item.href}>
                  {item.icon}
                  {item.title}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};
