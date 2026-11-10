# Build status

The Android native shell has been added on the `android-native-shell` branch. This file records the first CI build checkpoint; it does not indicate that a build has passed.

The CI workflow now installs only `platform-tools` during Android SDK setup; the obsolete `tools` package was removed after the first runner failure.
