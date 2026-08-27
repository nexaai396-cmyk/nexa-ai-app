import { useCallback, useEffect, useState } from 'react';

/**
 * Minimal hash-based router for a Vite SPA.
 * Routes: '#/' (public), '#/admin' (admin).
 */
export type Route = 'public' | 'admin';

function parse(): Route {
  const h = window.location.hash.replace(/^#/, '');
  if (h === '/admin' || h === 'admin') return 'admin';
  return 'public';
}

export function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(parse);

  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((r: Route) => {
    const target = r === 'admin' ? '#/admin' : '#/';
    if (window.location.hash !== target) {
      window.location.hash = target;
    } else {
      setRoute(r);
    }
  }, []);

  return [route, navigate];
}
