import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '../store/user';

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('../layout/MainLayout.vue'),
    children: [
      { path: '', name: 'Home', component: () => import('../views/Home.vue') },
      { path: 'assessment', name: 'Assessment', component: () => import('../views/Assessment.vue') },
      { path: 'resources', name: 'Resources', component: () => import('../views/Resources.vue') },
      { path: 'competition', name: 'Competition', component: () => import('../views/Competition.vue') },
      { path: 'certificate', name: 'Certificate', component: () => import('../views/Certificate.vue') },
      { path: 'school', name: 'SchoolDocs', component: () => import('../views/SchoolDocs.vue') },
      { path: 'jobs/:id', name: 'JobDetail', component: () => import('../views/JobDetail.vue') },
      { path: 'study', name: 'Study', component: () => import('../views/Study.vue') },
      { path: 'civil', name: 'CivilService', component: () => import('../views/CivilService.vue') },
      { path: 'study/:key', name: 'StudyDetail', component: () => import('../views/StudyDetail.vue') },
      { path: 'plans', name: 'Plans', component: () => import('../views/Plans.vue') },
      { path: 'chat', name: 'Chat', component: () => import('../views/Chat.vue') },
      { path: 'interview', name: 'Interview', component: () => import('../views/Interview.vue') },
      { path: 'resume', name: 'Resume', component: () => import('../views/Resume.vue') },
      { path: 'forum', name: 'Forum', component: () => import('../views/Forum.vue') },
      { path: 'post/:id', name: 'PostDetail', component: () => import('../views/PostDetail.vue') },
      { path: 'profile', name: 'Profile', component: () => import('../views/Profile.vue') },
      { path: 'admin', name: 'Admin', component: () => import('../views/admin/Admin.vue'), meta: { admin: true } },
    ],
  },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to) => {
  const store = useUserStore();
  if (to.meta.public) return true;
  if (!store.isLogin) return { name: 'Login' };
  if (to.meta.admin && !store.isAdmin) return { name: 'Home' };
  return true;
});

export default router;