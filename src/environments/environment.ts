export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  auth0: {
    domain: 'your-tenant.eu.auth0.com',
    clientId: 'REPLACE_ME',
    audience: 'https://api.simplatform.io',
    redirectUri: 'http://localhost:4200/callback'
  }
};
