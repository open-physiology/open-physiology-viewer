var webpack           = require('webpack');
var path              = require('path');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var loaders           = require('./webpack.loaders.js');

module.exports = {
    devtool: 'source-map',
    target: 'node',
    output: {
        devtoolModuleFilenameTemplate:         '[absolute-resource-path]',
        devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
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
    			'THREE': 'three'
    		})        
    ]
};
