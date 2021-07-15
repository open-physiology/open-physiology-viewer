const loaders = require('./webpack.loaders.js');
const plugins = require('./webpack.plugins.js');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'development',
	context: __dirname + '/src',
    devtool: 'source-map',
    entry: {
        'test-app/index': [ '@babel/polyfill', 'reflect-metadata', 'zone.js/dist/zone.js', './test-app/index.js'],
        'open-physiology-viewer': [ '@babel/polyfill', 'reflect-metadata', 'zone.js/dist/zone.js', './index.js' ],
        'open-physiology-viewer-minimal':                                                        [ './index.js' ],
	    'converter': ['@babel/polyfill', 'reflect-metadata', './converter/converter.js']
    },
	output: {
		path: __dirname + '/dist',
		filename: '[name].js',
		sourceMapFilename: '[file].map',
		devtoolModuleFilenameTemplate:         '[absolute-resource-path]',
		devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
	},
	module: {
		rules: loaders
	},
	plugins: plugins.concat([
        new CopyWebpackPlugin([
            { from: 'test-app/index.html',  to: 'test-app/index.html' },
            { from: 'test-app/favicon.ico', to: 'test-app/favicon.ico' },
            { from: 'test-app/styles',      to: 'test-app/styles'}
        ])
    ])
};
