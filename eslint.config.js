// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // App screens synchronize with native Android state (permissions,
      // service status) when they mount. Those reads are asynchronous, but the
      // compiler lint cannot see through the hook and flags the intentional
      // "loading" update inside the effect.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
