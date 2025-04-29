# Bus ETA Notifier

Being tired about checking ETA of busses over and over again? Lost your attention at some point and end up missing the bus? Here is an app that could sound an alarm to notify you. It is written with busses in Chicago in mind.

![Bus ETA Notifier Icon](app-icon.png)

## Overview

Bus ETA Notifier is a cross-platform application that helps you stay on top of your public transit schedule by sending timely notifications when your bus is approaching. No more constantly checking the time or missing your bus while distracted!

## Features

- Real-time bus arrival predictions for Chicago transit
- Customizable notification alarms
- Favorite route saving
- Background monitoring
- Cross-platform support (Android, iOS, Windows, Linux, MacOS, the web version to come in the future)

## Installation

For now, compile from source (see below). 

#### Android

#### iOS

#### Windows

#### MacOS

#### Linux

#### Web

## Building from Source

### Prerequisites

- Node.js (v18 or newer)
- Yarn
- Rust (for Tauri desktop builds)
  - Install via [rustup](https://rustup.rs/)
- Platform-specific requirements:
  - **Windows**: Microsoft Visual Studio C++ Build Tools
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: Various development packages (see Tauri [setup guide](https://tauri.app/v1/guides/getting-started/prerequisites/))

### Mobile Builds (Tauri)

#### Android

```bash
# Install dependencies
yarn install

# Run development build for iOS
yarn tauri ios dev

# Build apk
yarn tauri android build -- --apk
```

#### iOS

```bash
# Install dependencies
yarn install

# Run development build for iOS
yarn tauri ios dev
```

### Desktop Builds (Tauri)

#### All Platforms

```bash
# Install dependencies
yarn install

# Run development build
yarn tauri dev

# Build for production (current platform)
yarn tauri build
```

## Permissions

### Important: Background and Notification Permissions

This app requires specific permissions to function properly:

#### Android

- **Notification Permission**: Required to send alerts when your bus is approaching
- **Background Running Permission**: Essential for monitoring bus ETAs even when the app is not in the foreground

To enable these on Android:

1. Go to Settings > Apps > Bus ETA Notifier
2. Enable notifications
3. Disable battery optimization for this app
4. Allow background activity

Without these permissions, the app cannot send timely notifications when your bus is approaching. On some Android devices, the system may aggressively kill background processes to save battery, which could prevent notifications from working properly. This is particularly important for Android 12+ where battery optimization is more aggressive.

#### iOS

- Allow notifications when prompted
- Allow background activity when prompted
- Disable battery optimization for reliable notifications

## Usage

1. Select your bus route
2. Set how many minutes before arrival you want to be notified
3. Enable notifications
4. The app will now monitor the bus ETA and notify you at the specified time

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

See the LICENSE file for details.
