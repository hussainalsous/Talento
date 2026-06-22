import { AppProviders } from './app/AppProviders';
import { AppRouter }    from './routes/AppRouter';

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
