import { useLocation } from 'react-router';

export const useShouldResetOnNavigate = (defaultValue = true) => {
  const location = useLocation();
  const shouldReset = location.state?.shouldReset ?? defaultValue;

  return { shouldReset };
};
