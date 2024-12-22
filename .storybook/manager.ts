import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';

const theme = create({
  base: 'light',
  brandTitle: 'Your Brand',
  brandUrl: 'https://yourbrand.com',
  brandImage: '/brand-light.svg',
  colorPrimary: '#FF4785',
});

addons.setConfig({
  theme,
});
