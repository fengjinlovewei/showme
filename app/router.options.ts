import type { RouterConfig } from '@nuxt/schema';

export default <RouterConfig>{
  routes: _routes => {
    return [
      ..._routes,
      {
        name: '404',
        path: '/404',
        component: () => import('~/error.vue'),
      },
      {
        name: 'main',
        path: '/',
        component: () => import('~/pages/main/index.vue'),
      },
    ];
  },
};
