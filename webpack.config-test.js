const loaders = require('./webpack.loaders.js');
const plugins = require('./webpack.plugins.js');
const nodeExternals = require('webpack-node-externals');

module.exports = {
    mode   : 'development',
    devtool: 'source-map',
    target : 'node',
    output : {
        devtoolModuleFilenameTemplate:         '[absolute-resource-path]',
        devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
    },
    module: {
        rules: loaders
    },
    plugins: plugins,
    externals: [nodeExternals()]
};
