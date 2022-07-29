const webpack              = require('webpack');
const path                 = require('path');
const LicensePlugin        = require('license-webpack-plugin').LicenseWebpackPlugin;

module.exports = [
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
        THREE: 'three',
        CSG: 'three-csg-ts',
        process: 'process/browser'
    }),
    new LicensePlugin({
        stats: {
            warnings: false,
            errors: false
        },
        outputFilename: 'meta/licenses-all.txt'
    })
];