type Props = {
  diagramSentence: string;
};

export const DiagramSentence = (props: Props) => {
  const { diagramSentence } = props;

  if (diagramSentence.length === 0) {
    return null;
  }

  return (
    <div className='p-4'>
      <h3 className='mb-2 text-std-18B-160'>回答</h3>
      <div className='flex justify-start whitespace-pre-wrap'>{diagramSentence}</div>
    </div>
  );
};
