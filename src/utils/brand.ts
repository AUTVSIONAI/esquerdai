export const BRAND = {
  name: import.meta.env.VITE_APP_NAME || 'Esquerdai',
  domain: import.meta.env.VITE_APP_DOMAIN || 'esquerdai.com',
  tagline: import.meta.env.VITE_APP_TAGLINE || 'Central da Esquerda',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || `suporte@${import.meta.env.VITE_APP_DOMAIN || 'esquerdai.com'}`,
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || `contato@${import.meta.env.VITE_APP_DOMAIN || 'esquerdai.com'}`,
  adminEmail: import.meta.env.VITE_ADMIN_EMAIL || `admin@${import.meta.env.VITE_APP_DOMAIN || 'esquerdai.com'}`,
};