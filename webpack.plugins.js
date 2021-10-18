const webpack              = require('webpack');
const path                 = require('path');
const FilterWarningsPlugin = require('webpack-filter-warnings-plugin');
const LicensePlugin        = require('license-webpack-plugin').LicenseWebpackPlugin;

module.exports = [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.ContextReplacementPlugin(
        /angular[\\\/]core[\\\/](esm[\\\/]src|src)[\\\/]linker/,
        path.resolve('./src'),
        {}
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
    }),
    new LicensePlugin({
        stats: {
            warnings: false,
            errors: false
        },
        outputFilename: 'meta/licenses-all.txt'
    })
];