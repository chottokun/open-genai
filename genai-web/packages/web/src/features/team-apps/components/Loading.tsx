export const Loading = () => {
  return new Array(5)
    .fill('')
    .map((_, idx) => (
      <div
        key={idx}
        aria-hidden={true}
        className='my-2 h-6 w-full animate-pulse rounded-4 bg-blue-50'
      />
    ));
};
