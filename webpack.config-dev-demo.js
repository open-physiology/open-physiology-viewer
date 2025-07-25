const path    = require('path');
const loaders = require('./webpack.loaders.js');
const plugins = require('./webpack.plugins.js');

module.exports = {
    mode   : 'development',
    devtool: 'eval-cheap-source-map',
	context: path.resolve(__dirname, 'src/'),
	entry  : {
        'demo-app/index': [ '@babel/polyfill', 'reflect-metadata', 'zone.js/dist/zone.js', './demo-app/index.js']
	},
	output: {
		path: path.resolve(__dirname, 'demo/'),
		filename: '[name].js',
		sourceMapFilename: '[file].map'
	},
	devServer: {
		static: {
		  directory: path.join(__dirname, 'demo'),
		},
		compress: true,
	    port: 8081
	},
	module: { rules: loaders },
	plugins: plugins
};
