import { Link } from 'react-router';
import { useHighlight } from '@/hooks/useHighlight';

type Props = {
  href: string;
  label: string;
  description: string;
  onClick: () => void;
  highlightWords?: string[];
};

export const ExAppListCard = (props: Props) => {
  const { href, onClick, label, description, highlightWords = [] } = props;
  const { highlightText } = useHighlight();

  return (
    <Link
      to={href}
      className={`group flex h-full flex-col rounded-8 bg-white border border-solid-gray-420 p-4 text-std-16N-175 hover:bg-blue-50 hover:border-solid-gray-500 focus-visible:ring-[calc(2/16*1rem)] focus-visible:ring-yellow-300 focus-visible:outline-4 focus-visible:outline-offset-[calc(2/16*1rem)] focus-visible:outline-black focus-visible:outline-solid`}
      onClick={onClick}
    >
      <div className='flex h-full w-full flex-col'>
        <h3 className='text-std-18B-160 underline underline-offset-[calc(3/16*1rem)] group-hover:decoration-[calc(3/16*1rem)]'>
          {highlightText(label, highlightWords)}
        </h3>
        <p className='mt-2 mb-3 text-std-16N-170 underline-offset-[calc(3/16*1rem)] group-hover:underline'>
          {highlightText(description, highlightWords)}
        </p>
      </div>
    </Link>
  );
};
