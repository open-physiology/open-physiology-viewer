const webpack              = require('webpack');
const path                 = require('path');
const LicensePlugin        = require('license-webpack-plugin').LicenseWebpackPlugin;
const fs                   = require('fs');

// Load KEY=VALUE pairs from .env (if present) without overriding variables already set in the shell
const envFile = path.resolve(__dirname, '.env');
if (fs.existsSync(envFile)) {
    fs.readFileSync(envFile, 'utf8').split(/\r?\n/).forEach(line => {
        const match = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
        if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
        }
    });
}

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
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
    }),
    new LicensePlugin({
        stats: {
            warnings: false,
            errors: false
        },
        outputFilename: 'meta/licenses-all.txt'
    }),
    new webpack.DefinePlugin({
        'process.env.GITHUB_TOKEN': JSON.stringify(process.env.GITHUB_TOKEN),
        'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY),
        'process.env.ANTHROPIC_API_KEY': JSON.stringify(process.env.ANTHROPIC_API_KEY),
        'process.env.GOOGLE_CREDENTIALS_JSON': JSON.stringify(process.env.GOOGLE_CREDENTIALS_JSON),
        'process.env.DRIVE_API_KEY': JSON.stringify(process.env.DRIVE_API_KEY)
    })
];