var webpack = require('webpack');
var loaders = require('./webpack.loaders.js');

module.exports = {
	devtool: 'source-map',
	module: {
		loaders: loaders
	},
	output: {
		// source-map support for IntelliJ/WebStorm
		devtoolModuleFilenameTemplate:         '[absolute-resource-path]',
		devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
	},
	target: 'node',
	externals: [require('webpack-node-externals')()]
};
