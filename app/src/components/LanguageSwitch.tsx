'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import './css/LanguageSwitch.css';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  function changeLanguage(newLocale: string) {
    document.cookie =
      `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    router.refresh();
  }

  return (
    <select
      value={locale}
      onChange={(e) => changeLanguage(e.target.value)}
      className="language-switch"
    >
      <option value="en">EN</option>
      <option value="es">ES</option>
    </select>
  );
}