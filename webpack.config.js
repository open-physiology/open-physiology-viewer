const path    = require('path');
const loaders = require('./webpack.loaders.js');
const plugins = require('./webpack.plugins.js');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    devtool: 'source-map',
  	context: path.resolve(__dirname, 'src/'),
    entry: {
        'main-app/index': [ '@babel/polyfill', 'reflect-metadata', 'zone.js/dist/zone.js', './main-app/index.js'],
        'open-physiology-viewer': [ '@babel/polyfill', 'reflect-metadata', 'zone.js/dist/zone.js', './index.js' ],
        'open-physiology-viewer-minimal':                                                        [ './index.js' ],
	    'converter': ['@babel/polyfill', 'reflect-metadata', './converter/converter.js']
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
	plugins: plugins.concat([
        new CopyWebpackPlugin({
            "patterns": [
                { from: 'main-app/index.html',  to: 'main-app/index.html' },
                { from: 'common/favicon.ico', to: 'main-app/favicon.ico' },
                { from: 'common/styles',      to: 'main-app/styles'},
                { from: 'common/styles/images', to: 'main-app/styles/images'}
            ]
        })
    ])
};
