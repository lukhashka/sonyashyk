import { Component, type ErrorInfo, type ReactNode } from 'react';
import { withTranslation, type WithTranslation } from 'react-i18next';
import { Button, EmptyState } from '@/shared/ui';

interface Props extends WithTranslation {
  children: ReactNode;
}

class Boundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error(error, info);
  }

  render() {
    const { t, children } = this.props;
    if (!this.state.failed) return children;
    return (
      <EmptyState emoji="🥀" title={t('error.title')}>
        <p>{t('error.text')}</p>
        <Button variant="soft" className="mt-3" onClick={() => this.setState({ failed: false })}>
          {t('error.retry')}
        </Button>
      </EmptyState>
    );
  }
}

/** A crashing module must not break the whole app (spec §8). */
export const ModuleErrorBoundary = withTranslation('common')(Boundary);
