const path    = require('path');
const loaders = require('./webpack.loaders.js');
const plugins = require('./webpack.plugins.js');

module.exports = {
    mode   : 'development',
    devtool: 'eval-cheap-source-map',
	context: path.resolve(__dirname, 'src/'),
	entry  : {
        'main-app/index': [ '@babel/polyfill', 'reflect-metadata', 'zone.js/dist/zone.js', './main-app/index.js']
	},
	output: {
		path: path.resolve(__dirname, 'dist/'),
		filename: '[name].js',
		sourceMapFilename: '[file].map'
	},
	devServer: {
		static: {
		  directory: path.join(__dirname, 'dist'),
		},
		compress: true,
	    port: 8081
	},
	module: { rules: loaders },
	plugins: plugins
};
