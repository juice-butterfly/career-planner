import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    // token 存于后端 HttpOnly Cookie，前端不落 localStorage，更安全
    user: JSON.parse(localStorage.getItem('user') || 'null'),
  }),
  getters: {
    isLogin: (s) => !!s.user,
    isAdmin: (s) => s.user?.role === 'admin',
  },
  actions: {
    setLogin(user) {
      this.user = user;
      localStorage.setItem('user', JSON.stringify(user));
    },
    setUser(user) {
      this.user = user;
      localStorage.setItem('user', JSON.stringify(user));
    },
    logout() {
      this.user = null;
      localStorage.removeItem('user');
    },
  },
});