type Props = {
  className?: string;
};

export const Footer = (props: Props) => {
  const { className } = props;

  return (
    <footer
      className={`flex flex-col items-center gap-y-2 p-6 text-std-16N-170 ${className ?? ''}`}
    >
      <p className='font-bold'>Open GENAI</p>
      <p>© 2026 Open GENAI Project</p>
    </footer>
  );
};
