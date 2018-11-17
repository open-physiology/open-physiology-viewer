const webpack           = require('webpack');
const path              = require('path');
const loaders           = require('./webpack.loaders.js');

module.exports = {
    mode: 'development',
    devtool: 'source-map',
    target: 'node',
    output: {
        devtoolModuleFilenameTemplate:         '[absolute-resource-path]',
        devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
    },
    module: {
        rules: loaders
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
    	}),
        new FilterWarningsPlugin({
            exclude: /System.import/
        })
    ]
};
