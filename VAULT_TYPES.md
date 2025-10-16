# Understanding Vault Types

## TL;DR

**For 99% of users: Use `type: "local"`** - even if your vault is synced via iCloud, Dropbox, or Obsidian Sync. Point to the folder location on your computer.

## Important: Obsidian Has No Public API

⚠️ **Obsidian does NOT provide a public API** for remote vault access. Their services (Obsidian Sync, Obsidian Publish) are closed systems by design.

What Obsidian DOES provide:
- ✅ **Plugin API** - For building plugins that run in the desktop app
- ✅ **URI Protocol** - For opening notes/executing commands (requires app running)
- ✅ **Community Plugin "Local REST API"** - Third-party localhost API (requires app running)

What Obsidian does NOT provide:
- ❌ Public API for Obsidian Sync
- ❌ Cloud API for remote access
- ❌ Server-side vault access

**This is intentional** - Obsidian is privacy-first, keeping your data on your devices.

## The Three Connection Types

### 1. Local Vault (`type: "local"`)
**What it is:** Direct filesystem access to your Obsidian vault folder.

**Use when:**
- Your vault is on your computer's hard drive
- Your vault is in iCloud/Dropbox/OneDrive (synced folder)
- Your vault is on a mounted network drive
- Your vault uses Obsidian Sync (the folder is still local)

**Example:**
```json
{
  "name": "my-vault",
  "type": "local",
  "path": "/Users/you/Documents/ObsidianVault"
}
```

**How it works:** Reads and writes markdown files directly from the filesystem.

---
### 2. Remote Vault (`type: "remote"`)
**What it is:** Connects to a self-hosted REST API server that provides access to your vault.

**Use when:**
- You've built your own sync server
- You have a custom REST API for serving Obsidian notes
- You're using a third-party sync service with an HTTP API
- **NOT for Obsidian Sync** (that's still local - use `type: "local"`)

**Example:**
```json
{
  "name": "cloud-vault",
  "type": "remote",
  "url": "https://my-obsidian-server.com/api",
  "apiKey": "your-secret-key",
  "syncInterval": 60000
}
```

**How it works:** Makes HTTP requests to your API to read/write notes.

**⚠️ You need to implement the server yourself!** This is for advanced users who want to build custom sync infrastructure.

---

### 3. Obsidian API (Optional)
**What it is:** Controls the Obsidian desktop application itself (NOT vault content).

**Use when:**
- You want to open notes in the Obsidian app
- You want to execute Obsidian commands
- You want app-level features

**Requires:** "Local REST API" community plugin installed in Obsidian

**Example:**
```json
{
  "obsidianApi": {
    "restApiUrl": "http://localhost:27124",
    "apiKey": "your-plugin-api-key",
    "vaultName": "my-vault"
  }
}
```

**How it works:** Sends commands to the running Obsidian application.

**Note:** This is completely separate from vault access. You still need a vault configuration (local or remote).

---

## Common Misunderstandings

### ❌ "I use iCloud/Obsidian Sync, so I need `type: remote`"
**✅ No!** Use `type: "local"` and point to the synced folder on your computer. The cloud service handles syncing automatically.

### ❌ "I need the Local REST API plugin to access my vault"
**✅ No!** The plugin is only for controlling the Obsidian app itself. For vault access, use `type: "local"`.

### ❌ "Remote vault connects to Obsidian's cloud"
**✅ No!** Obsidian Sync doesn't have a public API. Remote vault is for YOUR OWN server.

---

## Decision Tree

```
Do you have a vault folder on your computer?
├─ YES → Use type: "local" (even if it's synced via iCloud/Dropbox/Obsidian Sync)
└─ NO → Did you build a custom REST API server for your notes?
    ├─ YES → Use type: "remote"
    └─ NO → You need type: "local" - download/sync your vault first

Do you want to open notes in the Obsidian app?
├─ YES → Configure "obsidianApi" section + install Local REST API plugin
└─ NO → Skip the "obsidianApi" section
```

---

## Real World Examples

### Example 1: Personal vault on computer
```json
{
  "vaults": [
    {
      "name": "personal",
      "type": "local",
      "path": "/home/user/Documents/MyVault"
    }
  ]
}
```

### Example 2: Vault synced via iCloud
```json
{
  "vaults": [
    {
      "name": "icloud-vault",
      "type": "local",
      "path": "/Users/user/Library/Mobile Documents/iCloud~md~obsidian/Documents/MyVault"
    }
  ]
}
```
Note: iCloud handles the syncing - you just access the local folder.

### Example 3: Multiple vaults
```json
{
  "vaults": [
    {
      "name": "work",
      "type": "local",
      "path": "/home/user/Dropbox/WorkVault"
    },
    {
      "name": "personal",
      "type": "local",
      "path": "/home/user/Documents/PersonalVault"
    }
  ]
}
```

### Example 4: Custom sync server (advanced)
```json
{
  "vaults": [
    {
      "name": "self-hosted",
      "type": "remote",
      "url": "https://notes.myserver.com/api",
      "apiKey": "my-secret-key-123",
      "syncInterval": 30000
    }
  ]
}
```
⚠️ Requires implementing the server API yourself!

---

## Frequently Asked Questions

### Q: Can I access my Obsidian Sync vault remotely via API?
**A: No.** Obsidian Sync does not provide a public API. The vault is synced to your local device, and you access it via `type: "local"` pointing to the local folder.

### Q: Does Obsidian have a cloud API?
**A: No.** Obsidian is privacy-first and doesn't expose your data via cloud APIs. All access is local.

### Q: What about the "Local REST API" plugin?
**A: It only works locally.** The plugin creates an API on localhost (127.0.0.1) that only your computer can access. It's not accessible from other devices or the internet.

### Q: Can I build a mobile app that accesses my vault remotely?
**A: Not via Obsidian's services.** You would need to:
1. Build your own sync server with an API
2. Use `type: "remote"` configuration
3. Or use cloud storage (Dropbox, iCloud) and access the local synced folder with `type: "local"`

### Q: What's the "Local REST API" plugin for then?
**A: Local app integration only.**
- Opening notes in the Obsidian app
- Executing commands
- Controlling the app programmatically
- Only works when the Obsidian app is running on the same machine

### Q: Can I use this MCP server from a remote machine?
**A: Yes, for local vaults over the network:**
1. Mount the vault folder via NFS/SMB/SSHFS
2. Use `type: "local"` pointing to the mounted path
3. Or build your own REST API server and use `type: "remote"`

### Q: What about Obsidian Publish?
**A: It's for publishing, not vault access.** Obsidian Publish creates a static website from your notes. It has no API for reading/writing vault content.

---

## Summary

- **90%+ of users:** Use `type: "local"` pointing to your vault folder
- **Cloud sync users (iCloud, Dropbox, Obsidian Sync):** Still use `type: "local"` pointing to the synced folder
- **Advanced users with custom servers:** Use `type: "remote"` with your API URL
- **Want app integration:** Add `obsidianApi` config + install "Local REST API" community plugin
- **Remember:** Obsidian has NO public cloud API - by design!
