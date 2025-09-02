const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const ClaudeTerminal = require('./claude-terminal');
const Store = require('electron-store');

let mainWindow;
let terminal;

// Initialize secure storage
const store = new Store({
  encryptionKey: 'trinity-motion-secure-key',
  schema: {
    apiKeys: {
      type: 'object',
      properties: {
        openai: { type: 'string' },
        anthropic: { type: 'string' },
        google: { type: 'string' },
        perplexity: { type: 'string' }
      }
    }
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: '#0f0f0f',
    titleBarStyle: 'default',
    frame: true
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  
  // Initialize terminal
  const projectPath = path.resolve(__dirname, '../../..');
  terminal = new ClaudeTerminal(projectPath);
  
  // Set up IPC handlers for terminal
  setupTerminalIPC();
}

function setupTerminalIPC() {
  // Handle terminal start
  ipcMain.handle('terminal-start', () => {
    terminal.startSession();
    return { success: true };
  });

  // Handle terminal input
  ipcMain.handle('terminal-input', (event, data) => {
    terminal.write(data);
    return { success: true };
  });

  // Handle terminal resize
  ipcMain.handle('terminal-resize', (event, { cols, rows }) => {
    terminal.resize(cols, rows);
    return { success: true };
  });

  // Handle Claude start with context
  ipcMain.handle('terminal-start-claude', (event, { currentTask, contextData }) => {
    terminal.startClaude(currentTask, contextData);
    return { success: true };
  });

  // Forward terminal output to renderer
  terminal.on('output', (data) => {
    mainWindow.webContents.send('terminal-output', data);
  });

  terminal.on('exit', () => {
    mainWindow.webContents.send('terminal-exit');
  });

  terminal.on('error', (error) => {
    mainWindow.webContents.send('terminal-error', error.message);
  });
  
  // API Keys IPC handlers
  ipcMain.handle('save-keys', (event, keys) => {
    try {
      store.set('apiKeys', keys);
      console.log('🔑 API keys saved successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error saving API keys:', error);
      throw error;
    }
  });
  
  ipcMain.handle('get-keys', (event) => {
    try {
      return store.get('apiKeys', {});
    } catch (error) {
      console.error('❌ Error loading API keys:', error);
      return {};
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
