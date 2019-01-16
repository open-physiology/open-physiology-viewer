const webpack              = require('webpack');
const path                 = require('path');
const FilterWarningsPlugin = require('webpack-filter-warnings-plugin');

module.exports = [
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
];