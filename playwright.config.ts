import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'tests/e2e',fullyParallel:false,workers:1,timeout:30000,
 use:{baseURL:'http://127.0.0.1:5180',trace:'retain-on-failure',reducedMotion:'reduce'},
 webServer:{command:'npm run dev -- --port 5180 --strictPort',url:'http://127.0.0.1:5180',reuseExistingServer:false,env:{VITE_SUPABASE_URL:'https://sonvera-test.supabase.co',VITE_SUPABASE_ANON_KEY:'test-anon-key'}}
});
