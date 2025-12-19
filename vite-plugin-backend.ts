// Vite plugin to start backend server automatically
import { spawn, type ChildProcess } from 'child_process';
import type { Plugin } from 'vite';

export function backendServerPlugin(): Plugin {
  let serverProcess: ChildProcess | null = null;

  return {
    name: 'backend-server',
    
    configureServer() {
      // Start the backend server when Vite starts
      console.log('\n🚀 Starting backend server...\n');
      
      serverProcess = spawn('node', ['server/index.cjs'], {
        stdio: 'inherit',
        shell: true,
      });

      serverProcess.on('error', (error) => {
        console.error('❌ Failed to start backend server:', error);
      });

      serverProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`❌ Backend server exited with code ${code}`);
        }
      });
    },

    closeBundle() {
      // Kill the backend server when Vite stops
      if (serverProcess) {
        console.log('\n🛑 Stopping backend server...\n');
        serverProcess.kill();
        serverProcess = null;
      }
    },
  };
}
