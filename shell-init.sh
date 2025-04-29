#!/bin/sh
# Only on macOS
export ANDROID_HOME="$HOME/Library/Android/sdk"
NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 "$ANDROID_HOME/ndk" | head -n 1)"
export NDK_HOME
BUILD_TOOLS_PATH="$ANDROID_HOME/build-tools/$(ls -1 "$ANDROID_HOME/build-tools" | head -n 1)"
export PATH="$ANDROID_HOME/platform-tools:$BUILD_TOOLS_PATH:$ANDROID_HOME/emulator:$PATH"
export TAURI_ANDROID_DEV_ENV_VARS_SET=1
