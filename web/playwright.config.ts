import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'*.spec.ts',timeout:30000,workers:1,use:{baseURL:'http://127.0.0.1:4173',headless:true},webServer:{command:'node tests/server.mjs',port:4173,reuseExistingServer:false},reporter:[['list'],['json',{outputFile:'../docs/frontend/browser-results.json'}]],outputDir:'/tmp/pepe-playwright-results'});
