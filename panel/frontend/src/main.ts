import './app.css';
import { mount } from 'svelte';
import { initI18n } from '$lib/i18n';
import App from './App.svelte';

async function bootstrap() {
  await initI18n();

  const appElement = document.getElementById('app');
  if (!appElement) throw new Error('App element not found');

  mount(App, {
    target: appElement
  });
}

bootstrap();
