// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const owner = process.env.GITHUB_REPOSITORY_OWNER;
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const fallbackSite = 'https://sakaicontrib.github.io/sakai-website';

// https://astro.build/config
export default defineConfig({
  site: owner ? `https://${owner}.github.io` : fallbackSite,
  base: isGitHubActions && repoName ? `/${repoName}` : '/',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()]
  }
});
