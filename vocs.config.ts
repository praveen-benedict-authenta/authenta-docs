import { defineConfig } from 'vocs';

export default defineConfig({
  logoUrl: '/logo.png',
  title: 'Authenta Docs',
  description: 'Deepfake & Image Forgery Detection Service',
  theme: {
    accentColor: '#6968ae',
  },
  topNav: [
    { text: 'Documentation', link: '/on-prem/overview', match: '/on-prem' },
    { text: 'Try Authenta', link: 'https://platform.authenta.ai' },
    {
      text: 'Resources',
      items: [
        {
          text: 'GitHub',
          link: 'https://github.com/praveen-benedict-authenta/authenta-docs',
        },
        {
          text: 'Support',
          link: '/on-prem/support',
        },
      ],
    },
  ],
  rootDir: 'docs',
  sidebar: {
    '/on-prem': [
      {
        text: 'Getting Started',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/on-prem/overview' },
          { text: 'Introduction', link: '/on-prem/introduction' },
        ],
      },
      {
        text: 'Deployment',
        collapsed: false,
        items: [
          { text: 'Architecture', link: '/on-prem/architecture' },
          { text: 'Prerequisites', link: '/on-prem/prerequisites' },
          { text: 'Installation Setup', link: '/on-prem/installation-setup' },
          { text: 'Configuration', link: '/on-prem/configuration' },
        ],
      },
      {
        text: 'Using Authenta',
        collapsed: false,
        items: [{ text: 'Using Authenta', link: '/on-prem/using-authenta' }],
      },
      {
        text: 'Operations',
        collapsed: false,
        items: [
          { text: 'Maintenance & Updates', link: '/on-prem/maintenance-updates' },
          { text: 'Security & Compliance', link: '/on-prem/security-compliance' },
          { text: 'Troubleshooting', link: '/on-prem/troubleshooting' },
          { text: 'Support', link: '/on-prem/support' },
        ],
      },
    ],
    '/api': [
      {
        text: 'Overview',
        collapsed: false,
        items: [
          { text: 'Introduction', link: '/api/introduction' },
          { text: 'Getting Access', link: '/api/api-access' },
          { text: 'Authentication', link: '/api/authentication' },
          { text: 'Quotas & Credits', link: '/api/quotas-and-credits' },
        ],
      },
      {
        text: 'Using the API',
        collapsed: false,
        items: [
          { text: 'Managing API Keys', link: '/api/managing-api-keys' },
          { text: 'Making Requests', link: '/api/making-api-calls' },
          // { text: 'Errors & Troubleshooting', link: '/api/errors' },
          // { text: 'Postman Collection', link: '/api/postman-collection' },
        ],
      },
      {
        text: 'API Reference',
        collapsed: false,
        items: [{ text: 'Media API', link: '/api/reference/media' }],
      },
      // {
      //   text: 'Resources',
      //   collapsed: false,
      //   items: [
      //     { text: 'TypeScript Types', link: '/api/types' },
      //     { text: 'Changelog', link: '/api/changelog' },
      //     { text: 'Support', link: '/api/support' },
      //   ],
      // },
    ],
  },
});
