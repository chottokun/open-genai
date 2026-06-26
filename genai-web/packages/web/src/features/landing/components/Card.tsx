import { Link, LinkProps } from 'react-router';

type Props = LinkProps & {
  className?: string;
  title: string;
  description: string;
};

export const Card = (props: Props) => {
  const { title, description, to, className, ...rest } = props;
  return (
    <Link
      to={to}
      className={`group flex flex-col rounded-16 border border-solid-gray-500 bg-white p-4 hover:bg-blue-50 focus-visible:ring-[calc(2/16*1rem)] focus-visible:ring-yellow-300 focus-visible:outline-4 focus-visible:outline-offset-[calc(2/16*1rem)] focus-visible:outline-black focus-visible:outline-solid ${className ?? ''}`}
      {...rest}
    >
      <div className='flex h-full flex-row items-start gap-4 xl:gap-5'>
        <div className='flex h-full w-full flex-col'>
          <h3 className='flex items-center text-std-18B-160 underline underline-offset-[calc(3/16*1rem)] group-hover:decoration-[calc(3/16*1rem)]'>
            {title}
          </h3>
          <p className='mt-2 mb-3 text-std-16N-170 underline-offset-[calc(3/16*1rem)] group-hover:underline'>
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
};
