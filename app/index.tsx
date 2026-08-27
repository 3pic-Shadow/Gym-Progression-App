import { Redirect } from 'expo-router';

import { routes } from '@/src/utils/routes';

export default function IndexScreen() {
  return <Redirect href={routes.home} />;
}
