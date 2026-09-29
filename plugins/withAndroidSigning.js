const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Adds a `release` signing config to the generated android/app/build.gradle.
 *
 * `expo prebuild` regenerates that file from the Expo template, which signs
 * release builds with the debug key. Editing it by hand would be wiped on the
 * next prebuild, hence this plugin.
 *
 * The keystore is read from Gradle properties, injected by the release
 * workflow from the repository secrets. When they are absent -- a plain local
 * `expo run:android` -- the build falls back to the debug key exactly as
 * before, so nothing changes for day-to-day development.
 */
const RELEASE_SIGNING_CONFIG = `
        release {
            if (project.hasProperty('ADVENTOOLS_STORE_FILE')) {
                storeFile file(ADVENTOOLS_STORE_FILE)
                storePassword ADVENTOOLS_STORE_PASSWORD
                keyAlias ADVENTOOLS_KEY_ALIAS
                keyPassword ADVENTOOLS_KEY_PASSWORD
            }
        }`;

const RELEASE_SIGNING_CHOICE =
  "signingConfig project.hasProperty('ADVENTOOLS_STORE_FILE') ? signingConfigs.release : signingConfigs.debug";

module.exports = function withAndroidSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;

    if (gradle.includes('ADVENTOOLS_STORE_FILE')) return cfg;

    if (!gradle.includes('signingConfigs {')) {
      throw new Error('[withAndroidSigning] no signingConfigs block in build.gradle');
    }
    gradle = gradle.replace('signingConfigs {', `signingConfigs {${RELEASE_SIGNING_CONFIG}`);

    // Inside `buildTypes { release { ... } }` the template points at the debug
    // key; only that occurrence must change, not the one in `debug { ... }`.
    const releaseBlock = gradle.indexOf('release {', gradle.indexOf('buildTypes {'));
    if (releaseBlock === -1) {
      throw new Error('[withAndroidSigning] no release build type in build.gradle');
    }
    const target = 'signingConfig signingConfigs.debug';
    const at = gradle.indexOf(target, releaseBlock);
    if (at === -1) {
      throw new Error('[withAndroidSigning] release build type does not use the debug key');
    }
    gradle = gradle.slice(0, at) + RELEASE_SIGNING_CHOICE + gradle.slice(at + target.length);

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
