module.exports = [
	{
		test: /\.js$/,
		exclude: /node_modules/,
		loader: 'babel-loader'
	},
	{
		test: /\.json$/,
		loader: 'json-loader'
	},
    {
    	test: /\.css$/,
		loader: "style-loader!css-loader?importLoaders=1"
    },
    {
    	test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
		loader: "url-loader"
	},
    {
    	test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
		loader: "url-loader"
    }

];
