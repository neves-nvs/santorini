import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

const NotFoundPage = () => {
  const { t } = useTranslation()

  return (
    <main className="page" style={{
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--brand-gradient)',
      color: 'white',
      padding: '1rem',
      textAlign: 'center'
    }}>
      <h1>{t('notFound.title')}</h1>
      <p style={{ marginBottom: '2rem' }}>{t('notFound.message')}</p>
      <Link to="/" style={{ color: 'white', fontSize: '1.1rem' }}>
        {t('notFound.back')}
      </Link>
    </main>
  )
}

export default NotFoundPage
