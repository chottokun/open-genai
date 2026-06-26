export const NavSkip = () => {
  return (
    <>
      <p id='window-title' className='sr-only' tabIndex={-1} />
      <a
        className={`sr-only top-1.5 left-1.5 inline-flex min-h-9 min-w-20 items-center justify-center rounded-6 text-oln-16B-100 text-blue-900 underline underline-offset-[calc(3/16*1rem)] focus-visible:not-sr-only focus-visible:fixed focus-visible:z-20 focus-visible:bg-yellow-300 focus-visible:px-3 focus-visible:py-0.5 focus-visible:ring-[calc(2/16*1rem)] focus-visible:ring-yellow-300 focus-visible:outline-4 focus-visible:outline-offset-[calc(2/16*1rem)] focus-visible:outline-black focus-visible:outline-solid`}
        href='#mainContents'
        id='skip-nav-label'
      >
        本文へ移動
      </a>
    </>
  );
};
