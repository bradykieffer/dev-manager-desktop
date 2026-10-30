# Device/DevMode Manager for webOS TV

Simple tool to manage developer mode enabled or rooted webOS
TV

## Download

Find [latest release](https://github.com/webosbrew/dev-manager-desktop/releases/latest), and download the installer for
your system

| Operating System                  | x86_64                                      | arm64                                         | x86                                       |
|-----------------------------------|---------------------------------------------|-----------------------------------------------|-------------------------------------------|
| Windows 10+                       | webOS.Dev.Manager_[VERSION]_x64_en-US.msi   | Not available                                 | webOS.Dev.Manager_[VERSION]_x86_en-US.msi |
| Windows 7/8/8.1 (Dropped support) | webOS.Dev.Manager_1.13.3_x64_en-US.msi      | Not available                                 | webOS.Dev.Manager_1.13.3_x86_en-US.msi    |
| macOS                             | webOS.Dev.Manager_[VERSION]_universal.dmg   | webOS.Dev.Manager_[VERSION]_universal.dmg     | Not available                             |
| Linux (Debian/Ubuntu)             | webos-dev-manager_[VERSION]_amd64.deb       | webos-dev-manager_[VERSION]_arm64.deb         | Not available                             |
| Linux (Other distros)             | webos-dev-manager_[VERSION]_amd64.AppImage  | webos-dev-manager_[VERSION]_aarch64.AppImage  | Not available                             |

### AppImage updates

Official AppImage builds include update metadata for tools such as
[AppImageUpdate](https://github.com/AppImageCommunity/AppImageUpdate).
Download the AppImage for your architecture; the matching `.AppImage.zsync`
file is published alongside it for update tools. Stable releases and workflow
snapshots track the latest stable release; prerelease builds track the
latest prerelease. Updates keep the same architecture. Older AppImages without
this metadata need a manual download first.

### Scheduled Developer Mode renewal

The generated renewal shell script requires `curl`, `jq`, and OpenSSH (`ssh`
and `ssh-keygen`) on the machine that runs it. Install these with its package
manager before scheduling the script (including on OpenWrt). The script uses
a persistent token cache when the TV is unreachable and exits with an error
if the request fails or the server does not report success.

### SSH-agent authentication

Choose **SSH Agent** when adding or editing a device to use keys already loaded
in your local SSH agent (`ssh-add -l` lists them). The matching public key must
be authorized on the TV. The app uses `SSH_AUTH_SOCK` from its launch environment;
if your desktop launcher doesn't inherit it, launch the app from a terminal
where the agent is available. This also works with agents such as 1Password
when their socket is exported as `SSH_AUTH_SOCK`. For 1Password, check its
menu-bar or tray icon during connection: approval prompts can wait in the
background rather than opening a window automatically.

Agent-backed devices store no private key or password. Existing devices with
neither also try the agent. Keys stay in the agent; they cannot be exported
by the app for a standalone Developer Mode renewal script.

### Running locally

Run `npm ci`, then `npm start`. On macOS, the development runner wraps each
Rust build in an ad-hoc-signed `.app` with a separate development identity and
launches it through macOS LaunchServices (`open`). This lets 1Password
recognize foreground SSH-agent requests instead of silently treating the raw
development executable as a background process.
Rust rebuilds and frontend hot reload still work. Use `npm start` or
`npm run tauri dev` rather than invoking `tauri dev` directly to use this runner.
macOS app output is written to `target/.macos-dev-app.log`; build output stays
in the terminal.

## Features

- No need to install LG SDK or IDE
- Add device without need to use command line
- Install apps on TV with a few clicks
- Configuration compatible with [ares-cli](https://github.com/webosose/ares-cli)
- Works on Windows, Linux and macOS (Apple Silicon too!)
- Dark mode follows system preferences

![Add Device](https://user-images.githubusercontent.com/830358/215522596-196d9629-3942-4533-bebb-5a81ba62ebc0.png)

![Installed Apps](https://user-images.githubusercontent.com/830358/215522298-eadebc84-661b-40ad-b6a9-9379710f88dc.png)

![Install from webOS Homebrew repo](https://user-images.githubusercontent.com/830358/215523117-0fdbde24-a503-4eed-8e2f-50a3486ce7f7.png)

![Manage Files](https://user-images.githubusercontent.com/830358/215522354-50997437-e3de-43a9-89cc-52cdaecb0502.png)

![Built-in Terminal](https://user-images.githubusercontent.com/830358/215522468-bc3e4871-01b2-4eed-a8b2-31f683874ba1.png)

![Device Information](https://user-images.githubusercontent.com/830358/215522554-5554a89b-ff3e-455e-8ed7-0f28c03f04a9.png)
