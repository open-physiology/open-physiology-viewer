const path    = require('path');
const loaders = require('./webpack.loaders.js');
const plugins = require('./webpack.plugins.js');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    devtool: 'source-map',
  	context: path.resolve(__dirname, 'src/'),
    entry: {
        'hubmap-app/index': [ '@babel/polyfill', 'reflect-metadata', 'zone.js/dist/zone.js', './hubmap-app/index.js'],
        'hubmap-viewer': [ '@babel/polyfill', 'reflect-metadata', 'zone.js/dist/zone.js', './index.js' ],
        'hubmap-viewer-minimal': [ './index.js' ]
    },
	output: {
		path: __dirname + '/hubmap',
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
                { from: 'hubmap-app/index.html',  to: 'hubmap-app/index.html' },
                { from: 'hubmap-app/favicon.ico', to: 'hubmap-app/favicon.ico' },
                { from: 'hubmap-app/styles',      to: 'hubmap-app/styles'},
                { from: 'hubmap-app/styles/images', to: 'hubmap-app/styles/images'}
            ]
        })
    ])
};
