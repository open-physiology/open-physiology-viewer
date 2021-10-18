const path    = require('path');
const loaders = require('./webpack.loaders.js');
const plugins = require('./webpack.plugins.js');

module.exports = {
    mode   : 'development',
    devtool: 'cheap-eval-source-map',
	context: path.resolve(__dirname, 'src/'),
	entry  : {
        'test-app/index': [ '@babel/polyfill', 'reflect-metadata', 'zone.js/dist/zone.js', './test-app/index.js']
	},
	output: {
		path: path.resolve(__dirname, 'dist/'),
		filename: '[name].js',
		sourceMapFilename: '[file].map'
	},
	devServer: {
	  contentBase: path.join(__dirname, "dist"),
	  compress: true,
	  port: 8081
	},
<<<<<<< HEAD
	module: { rules: loaders },
	plugins: plugins
=======
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
		      THREE: 'three'
		    })				
	]
>>>>>>> Added a Line2 geometry option. Essentially this method uses shaders. Produces comparable FPS to Three.Line
};
