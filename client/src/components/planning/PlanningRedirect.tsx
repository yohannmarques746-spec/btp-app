import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function PlanningRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation('/dashboard/planning');
  }, [setLocation]);
  return null;
}
