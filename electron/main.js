const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

// Define the path to save data. This will be in the user's AppData/UserData folder.
const dataPath = path.join(app.getPath('userData'), 'fintrack-data.json');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Add these for better compatibility
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../public/favicon.ico')
  });

  // Load from localhost if in dev mode, otherwise load the built index.html
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173'); // Vite's default port is 5173, not 3000
  } else {
    // Load the production build
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Log any loading errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // Log console messages from the renderer process
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Console [${level}]:`, message);
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

// --- IPC Handlers for File System Operations ---

// Helper to read the full data file
const readDataFile = () => {
  if (!fs.existsSync(dataPath)) {
    return {};
  }
  try {
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Error reading data file:", error);
    return {};
  }
};

// Handle saving data (Key-Value style, merging into the one JSON file)
ipcMain.handle('save-data', async (event, key, data) => {
  try {
    const currentData = readDataFile();
    currentData[key] = data;
    fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving data:", error);
    return false;
  }
});

// Handle getting data
ipcMain.handle('get-data', async (event, key) => {
  const currentData = readDataFile();
  return currentData[key] || null;
});