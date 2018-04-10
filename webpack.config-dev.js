var webpack           = require('webpack');
var path              = require('path');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var loaders           = require('./webpack.loaders.js');

module.exports = {
	devtool: 'cheap-eval-source-map',
	context: path.resolve(__dirname, 'src/'),
	entry: {
        'test-app/index': [ 'babel-polyfill', 'zone.js/dist/zone.js', './test-app/index.js' ]
	},
	output: {
		path: path.resolve(__dirname, 'dist/'),
		filename: '[name].js',
		sourceMapFilename: '[file].map'
	},
	devServer: {
	  contentBase: path.join(__dirname, "dist"),
	  compress: true,
	  port: 8081
	},
	module: {
		loaders: loaders
	},
	plugins: [
		new webpack.optimize.OccurrenceOrderPlugin(),
		new webpack.HotModuleReplacementPlugin(),
        new webpack.ContextReplacementPlugin(
            /angular(\\|\/)core(\\|\/)/,
            path.resolve(__dirname, '../src'), {}
        ),
        new webpack.ContextReplacementPlugin(
            /power-assert-formatter[\\\/]lib/,
            path.resolve('./src'),
            {}
        ),
				new webpack.ProvidePlugin({
		      THREE: 'three'
		    })				
	]
};
