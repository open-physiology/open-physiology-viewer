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
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: ["url-loader"]
    },
    {
        test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: ["url-loader"]
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
    }
];
