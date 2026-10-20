import { createHash } from 'node:crypto';
import { defineConfig } from 'vocs';

/** Comma-separated keys from the DEV_EXPLORER_KEYS secret; only their hashes reach the site (see docs/components/dev-access.ts) */
const devExplorerKeyHashes = (process.env.DEV_EXPLORER_KEYS ?? '')
  .split(',')
  .map(key => key.trim())
  .filter(Boolean)
  .map(key => createHash('sha256').update(key).digest('hex'));

export default defineConfig({
  vite: {
    define: { __DEV_EXPLORER_KEY_HASHES__: JSON.stringify(devExplorerKeyHashes) },
  },
  logoUrl: '/logo.png',
  title: 'Authenta Docs',
  description: 'Deepfake & Image Forgery Detection Service',
  theme: {
    accentColor: '#6968ae',
  },
  topNav: [
    // On-prem docs are hidden for now; the pages live in docs/drafts/on-prem
    // { text: 'Documentation', link: '/on-prem/overview', match: '/on-prem' },
    { text: 'API', link: '/api/introduction', match: '/api' },
    { text: 'API Explorer', link: '/api/explorer' },
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
          link: 'mailto:support@authenta.ai',
        },
      ],
    },
  ],
  rootDir: 'docs',
  sidebar: {
    // '/on-prem': [
    //   {
    //     text: 'Getting Started',
    //     collapsed: false,
    //     items: [
    //       { text: 'Overview', link: '/on-prem/overview' },
    //       { text: 'Introduction', link: '/on-prem/introduction' },
    //     ],
    //   },
    //   {
    //     text: 'Deployment',
    //     collapsed: false,
    //     items: [
    //       { text: 'Architecture', link: '/on-prem/architecture' },
    //       { text: 'Prerequisites', link: '/on-prem/prerequisites' },
    //       { text: 'Installation Setup', link: '/on-prem/installation-setup' },
    //       { text: 'Configuration', link: '/on-prem/configuration' },
    //     ],
    //   },
    //   {
    //     text: 'Integrations',
    //     collapsed: false,
    //     items: [{ text: 'Using Authenta', link: '/on-prem/using-authenta' }],
    //   },
    //   {
    //     text: 'Operations',
    //     collapsed: false,
    //     items: [
    //       { text: 'Maintenance & Updates', link: '/on-prem/maintenance-updates' },
    //       { text: 'Security & Compliance', link: '/on-prem/security-compliance' },
    //       { text: 'Troubleshooting', link: '/on-prem/troubleshooting' },
    //       { text: 'Support', link: '/on-prem/support' },
    //     ],
    //   },
    // ],
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
          { text: 'Python SDK', link: '/api/python-sdk' },
          // { text: '.NET SDK', link: '/api/dotnet-sdk' },
          { text: 'React Native SDK', link: '/api/react-native-sdk' },
          // { text: 'Errors & Troubleshooting', link: '/api/errors' },
          // { text: 'Postman Collection', link: '/api/postman-collection' },
        ],
      },
      {
        text: 'API Reference',
        collapsed: false,
        items: [
          { text: 'Jobs API', link: '/api/reference/jobs' },
          { text: 'API Explorer', link: '/api/explorer' },
        ],
      },
      {
        text: 'Task Types',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/api/task-types' },
          {
            text: 'Image',
            collapsed: true,
            items: [
              { text: 'AI Image Detector', link: '/api/task-types/ai-image-detection' },
              { text: 'Image Forgery Detection', link: '/api/task-types/image-forgery-detection' },
            ],
          },
          {
            text: 'Video and Face',
            collapsed: true,
            items: [
              { text: 'eKYC Deepfake Detection', link: '/api/task-types/ekyc-deepfake' },
              { text: 'AI Video Detector', link: '/api/task-types/ai-video-detection' },
              { text: 'Face Liveness Detection', link: '/api/task-types/face-liveness-detection' },
              { text: 'Face Intelligence', link: '/api/task-types/face-intelligence' },
            ],
          },
          {
            text: 'Audio',
            collapsed: true,
            items: [{ text: 'AI Audio Detector', link: '/api/task-types/ai-audio-detection' }],
          },
          {
            text: 'Documents',
            collapsed: true,
            items: [
              { text: 'Document Forgery Detection', link: '/api/task-types/document-intelligence' },
              { text: 'PDF Tampering Detection', link: '/api/task-types/pdf-tampering-detection' },
            ],
          },
          {
            text: 'Utilities',
            collapsed: true,
            items: [
              { text: 'Face Embedding', link: '/api/task-types/face-embedding' },
              { text: 'Audio Splitter', link: '/api/task-types/audio-splitter' },
            ],
          },
          {
            text: 'Deprecated',
            collapsed: true,
            items: [{ text: 'Face Swap Detection', link: '/api/task-types/faceswap-detection' }],
          },
        ],
      },
      {
        text: 'Postman Collection',
        collapsed: false,
        items: [{ text: 'Download Collection', link: '/api/postman' }],
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
