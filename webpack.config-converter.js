const path    = require('path');
const loaders = require('./webpack.loaders.js');
const plugins = require('./webpack.plugins.js');

module.exports = {
    mode: 'production',
    devtool: 'source-map',
  	context: path.resolve(__dirname, 'src/'),
    entry: {
	    'converter': [ '@babel/polyfill', 'reflect-metadata', './converter/converter.js' ]
    },
	output: {
		path: __dirname + '/dist',
        publicPath: '',
		filename: '[name].js',
		sourceMapFilename: '[file].map',
		devtoolModuleFilenameTemplate:         '[absolute-resource-path]',
		devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
 	},
	module: {
		rules: loaders
	},
	plugins: plugins
};
