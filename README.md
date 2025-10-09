# Minecraft Credential Logger

<div align="center">
  <img src="assets/Logo.png" alt="Minecraft Credential Logger" width="200"/>
  
  [![GitHub release](https://img.shields.io/github/v/release/itsreyi/Minecraft-Credential-Logger)](https://github.com/itsreyi/Minecraft-Credential-Logger/releases)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Node.js](https://img.shields.io/badge/node.js-%3E%3D18.0.0-green)](https://nodejs.org/)
  [![Java](https://img.shields.io/badge/java-%3E%3D17-orange)](https://adoptium.net/)
  
  **Professional Minecraft server credential capture tool for authorized penetration testing**
</div>

## 🎯 Overview

**Minecraft Credential Logger** is a sophisticated penetration testing tool designed for authorized security assessments of Minecraft servers. It creates a perfect clone of any target server using Velocity proxy technology, capturing authentication credentials when players attempt to log in.

### Key Features

- 🚀 **Automated Server Cloning** - One-click replication of any Minecraft server
- 🔍 **Advanced Server Scanning** - Comprehensive target analysis and compatibility detection  
- 🎮 **Universal Version Support** - Compatible with Minecraft 1.7.2 through 1.21+ via ViaVersion
- 🌐 **Public Tunneling** - Automatic ngrok integration for global accessibility
- 🔐 **Real-time Credential Capture** - Live monitoring of `/login` and `/register` commands
- 💬 **Discord Integration** - Instant webhook notifications for captured credentials
- 🖥️ **Modern GUI Interface** - Professional Electron-based desktop application
- 📊 **Statistics Dashboard** - Comprehensive analytics and performance monitoring
- 🔄 **Multi-Server Support** - Quick switching between different target servers

## 🛠️ Technical Architecture

### Core Components

- **Electron Frontend** - Modern dark-themed GUI with real-time updates
- **Velocity Proxy Server** - High-performance Minecraft proxy for server cloning
- **Protocol Handler** - minecraft-protocol integration for server communication
- **Credential Engine** - Advanced pattern matching for authentication capture
- **Discord Webhook** - Automated notifications and alert system
- **Ngrok Tunneling** - Secure public access through encrypted tunnels

### Supported Features

- ✅ **MOTD Replication** - Perfect message-of-the-day cloning with color codes
- ✅ **Favicon Extraction** - Automatic server icon capture and display
- ✅ **Player Count Spoofing** - Real-time player statistics mirroring
- ✅ **Plugin Detection** - Identification of authentication systems (AuthMe, etc.)
- ✅ **Version Compatibility** - Support for all Minecraft client versions
- ✅ **Connection Monitoring** - Real-time player connection tracking
- ✅ **Command Logging** - Comprehensive chat command analysis
- ✅ **Data Export** - JSON export functionality for captured credentials

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0.0 or higher
- **Java** 17 or higher (OpenJDK recommended)
- **Internet Connection** for ngrok tunneling
- **Discord Server** (optional, for webhook notifications)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/itsreyi/Minecraft-Credential-Logger.git
   cd Minecraft-Credential-Logger
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Launch the application**
   ```bash
   npm start
   ```

### Basic Usage

1. Enter target server details (host and port)
2. Click "Scan Server" to analyze the target
3. Click "Start Cloner" to begin the cloning process
4. Share the generated public URL with targets
5. Monitor captured credentials in real-time

For detailed setup instructions, see [INSTALLATION.md](INSTALLATION.md)

## 📖 Documentation

- 📋 **[Installation Guide](INSTALLATION.md)** - Complete setup instructions and requirements
- 📚 **[User Manual](WIKI.md)** - Comprehensive usage guide and best practices
- 🔧 **[Configuration](velocity-server/velocity.toml)** - Velocity proxy configuration
- 📊 **[API Reference](captured_credentials.json)** - Credential data structure

## 🔒 Security & Legal Notice

### ⚠️ IMPORTANT DISCLAIMER

This tool is designed **exclusively for authorized penetration testing and security research**. Users are responsible for ensuring they have explicit permission before testing any server.

### Legal Requirements

- ✅ **Written Authorization** - Obtain explicit permission from server owners
- ✅ **Scope Documentation** - Clearly define testing boundaries and limitations
- ✅ **Responsible Disclosure** - Report findings through proper channels
- ✅ **Data Protection** - Secure handling of captured credentials
- ❌ **Unauthorized Use** - Using this tool without permission is illegal

### Ethical Guidelines

- Only test servers you own or have explicit permission to test
- Immediately report security vulnerabilities to server administrators
- Delete captured data after testing completion
- Respect user privacy and data protection regulations
- Follow responsible disclosure practices for vulnerability reporting

## 🎮 Compatible Minecraft Versions

| Client Version | Server Support | Notes |
|----------------|----------------|-------|
| 1.21+ | ✅ Full Support | Latest protocol support |
| 1.20.x | ✅ Full Support | Complete compatibility |
| 1.19.x | ✅ Full Support | Chat signing handled |
| 1.18.x | ✅ Full Support | Height limit changes supported |
| 1.17.x | ✅ Full Support | Copper age compatibility |
| 1.16.x | ✅ Full Support | Nether update features |
| 1.15.x | ✅ Full Support | Bee update compatibility |
| 1.14.x | ✅ Full Support | Village & Pillage support |
| 1.13.x | ✅ Full Support | Aquatic update handled |
| 1.12.x | ✅ Full Support | World of Color support |
| 1.8.x - 1.11.x | ✅ Legacy Support | Via ViaBackwards plugin |
| 1.7.2 - 1.7.10 | ⚡ Experimental | Limited feature set |

## 📊 Performance Metrics

### System Requirements

- **Minimum RAM**: 2GB available memory
- **Recommended RAM**: 4GB+ for optimal performance
- **CPU**: Multi-core processor recommended
- **Storage**: 1GB free disk space
- **Network**: Stable internet connection (10+ Mbps)

### Performance Benchmarks

- **Server Scanning**: < 5 seconds for most servers
- **Cloning Setup**: 30-60 seconds (including downloads)
- **Credential Capture**: Real-time (< 100ms latency)
- **Tunnel Creation**: 10-30 seconds depending on region
- **Memory Usage**: ~200MB base + ~50MB per active connection

## 🛠️ Development

### Project Structure

```
minecraft-credential-logger/
├── assets/                  # Application assets
│   └── Logo.png            # Application logo
├── renderer/               # Frontend GUI components
│   ├── index.html         # Main interface
│   ├── styles.css         # Dark theme styling
│   └── renderer.js        # Frontend JavaScript logic
├── velocity-server/        # Minecraft proxy server
│   ├── velocity.jar       # Velocity 3.3.0-436
│   ├── velocity.toml      # Proxy configuration
│   ├── plugins/           # ViaVersion compatibility plugins
│   └── logs/              # Server operation logs
├── main.js                # Electron main process
├── minecraft-cloner.js    # Core cloning system
└── package.json           # Project dependencies
```

### Building from Source

```bash
# Development mode with DevTools
npm run dev

# Build for production
npm run build

# Console-only mode
npm run console <host> <port>
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔧 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Java not found | Install OpenJDK 17+ and add to PATH |
| Port already in use | Kill existing Java processes or change port |
| Ngrok connection failed | Check firewall settings and internet connection |
| No credentials captured | Verify target server uses supported authentication |
| Discord webhook not working | Check webhook URL and Discord permissions |

For detailed troubleshooting, see the [WIKI.md](WIKI.md) troubleshooting section.

## 📈 Changelog

### Version 1.0.0 (Current)
- ✅ Initial release with full GUI interface
- ✅ Automatic Velocity server setup and configuration  
- ✅ ViaVersion/ViaBackwards integration for universal compatibility
- ✅ Real-time credential capture with Discord notifications
- ✅ Ngrok tunnel integration for public access
- ✅ Advanced server scanning and MOTD replication
- ✅ Multi-server support with quick switching
- ✅ Comprehensive statistics and monitoring dashboard

## 🤝 Support

### Getting Help

- 📖 **Documentation**: Check [INSTALLATION.md](INSTALLATION.md) and [WIKI.md](WIKI.md)
- 🐛 **Bug Reports**: Open an issue with detailed reproduction steps
- 💡 **Feature Requests**: Describe your use case and requirements
- 🔒 **Security Issues**: Report privately via email

### Community

- **GitHub Issues**: Technical support and bug reports
- **Discussions**: Feature requests and general questions
- **Discord**: Community chat and real-time support (link in releases)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚖️ Disclaimer

This tool is provided for educational and authorized testing purposes only. The authors and contributors are not responsible for any misuse or damage caused by this tool. Users must ensure they have proper authorization before testing any systems and must comply with all applicable laws and regulations.

---

<div align="center">
  <strong>Remember: Always test responsibly and with proper authorization!</strong><br>
  <sub>Built with ❤️ for the cybersecurity community</sub>
</div>