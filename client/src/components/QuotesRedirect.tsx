import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function QuotesRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation('/dashboard/quotes');
  }, [setLocation]);
  return null;
}
