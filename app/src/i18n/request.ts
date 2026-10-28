import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = savedLocale === 'es' ? 'es' : 'en';

  const messages = (
    await import(`../../messages/${locale}.json`)
  ).default;

  return {
    locale,
    messages
  };
});