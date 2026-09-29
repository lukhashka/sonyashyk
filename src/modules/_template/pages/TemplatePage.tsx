import { useTranslation } from 'react-i18next';

export default function TemplatePage() {
  const { t } = useTranslation('template');
  return <h2>{t('title')}</h2>;
}
