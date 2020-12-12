require('babel-polyfill');
//require('@babel/plugin-transform-regenerator');

require('ignore-styles');

require('@babel/register')({
  ignore: [/(node_modules)/],
  presets: ['@babel/preset-env', '@babel/preset-react']
});

require('./server');