import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { Providers } from './providers/Providers';
import { createRouter } from './router';

export function App() {
  const [router] = useState(createRouter);
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
