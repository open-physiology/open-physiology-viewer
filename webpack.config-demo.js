const path    = require('path');
const loaders = require('./webpack.loaders.js');
const plugins = require('./webpack.plugins.js');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    devtool: 'source-map',
  	context: path.resolve(__dirname, 'src/'),
    entry: {
        'demo-app/index': [ '@babel/polyfill', 'reflect-metadata', 'zone.js/dist/zone.js', './demo-app/index.js'],
        'open-physiology-viewer': [ '@babel/polyfill', 'reflect-metadata', 'zone.js/dist/zone.js', './index.js' ],
        'open-physiology-viewer-minimal': [ './index.js' ]
    },
	output: {
		path: __dirname + '/demo',
        publicPath: '',
		filename: '[name].js',
		sourceMapFilename: '[file].map',
		devtoolModuleFilenameTemplate:         '[absolute-resource-path]',
		devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
 	},
	module: {
		rules: loaders
	},
	plugins: plugins.concat([
        new CopyWebpackPlugin({
            "patterns": [
                { from: 'demo-app/index.html',  to: 'demo-app/index.html' },
                { from: 'demo-app/favicon.ico', to: 'demo-app/favicon.ico' },
                { from: 'demo-app/styles',      to: 'demo-app/styles'},
                { from: 'demo-app/styles/images', to: 'demo-app/styles/images'}
            ]
        })
    ])
};
