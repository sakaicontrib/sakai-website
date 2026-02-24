// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const owner = process.env.GITHUB_REPOSITORY_OWNER;
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

// https://astro.build/config
export default defineConfig({
  site: owner ? `https://${owner}.github.io` : undefined,
  base: isGitHubActions && repoName ? `/${repoName}` : '/',
  vite: {
    plugins: [tailwindcss()]
  }
});
