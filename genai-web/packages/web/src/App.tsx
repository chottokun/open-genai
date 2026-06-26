import { useRoutes } from 'react-router';
import { NavSkip } from '@/components/ui/NavSkip';
import { createRoutes } from './routes';

export const App = () => {
  const routes = createRoutes();
  const element = useRoutes(routes);

  return (
    <>
      <NavSkip />
      {element}
    </>
  );
};
