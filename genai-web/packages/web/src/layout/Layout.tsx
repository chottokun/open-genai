import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Footer } from '@/components/ui/Footer';
import { Header } from '@/components/ui/Header';
import { useScrollRestoration } from '@/layout/hooks/useScrollRestoration';

const FOOTER_HIDDEN_PATHS = ['/chat', '/image'];

export const Layout = () => {
  const { pathname } = useLocation();
  const hideFooter = FOOTER_HIDDEN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  useScrollRestoration();

  return (
    <Suspense
      fallback={
        <div className='flex min-h-dvh items-center justify-center text-std-18N-160 text-solid-gray-800'>
          読み込み中…
        </div>
      }
    >
      <div id='layoutRoot' className='flex min-h-dvh w-screen flex-col'>
        <Header className='sticky top-0 z-10' isLandingPage={pathname === '/'} />
        <main id='mainContents' className='flex-1'>
          <Outlet />
        </main>
        {!hideFooter && <Footer />}
      </div>
    </Suspense>
  );
};
