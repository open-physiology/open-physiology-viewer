module.exports = [
    {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader']
    },
    {
        test: /\.css$/,
        use: [
            "style-loader",
            "css-loader"
        ]
    },
    {
        test: /\.(svg|eot|woff|woff2|ttf)$/,
        type: 'asset/resource',
        generator: {
            filename: 'fonts/[hash][ext][query]'
        }
    },
    {   test: /\.xlsx$/,
        loader: "webpack-xlsx-loader"
    },
    {
        test: /\.scss$/,
        exclude: /node_modules/,
        use: [
            "style-loader", // creates style nodes from JS strings
            "css-loader",   // translates CSS into CommonJS
            "sass-loader"   // compiles Sass to CSS, using Node Sass by default
        ]
    },
    {
        resolve: {
            fallback: {
                 "url": require.resolve("url/"),
                 "vm": require.resolve("vm-browserify"),
                 "stream": require.resolve("stream-browserify"),
                 "path": require.resolve("path-browserify"),
                 "util": require.resolve("util/"),
                 "process": false,
                 "fs": false,
                 "os": require.resolve("os-browserify"),
                 "assert": require.resolve("assert")
            },
        }
    }
];
