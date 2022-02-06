const path = require("path");
const glob = require("glob");
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { VueLoaderPlugin } = require('vue-loader');
const webpack = require('webpack');

module.exports = {
	mode: "development",
	entry: {
		"./styles" : glob.sync("./src/scss/**/*.scss"),
		"./scripts" : glob.sync("./src/js/**/*.js")
	},
	output: {
		path: path.resolve(__dirname, "./dist"),
		publicPath: "/dist/",
		filename: "[name].min.js",
		chunkFilename: "chunks/[name].min.js",
		clean: true
	},
	devtool: 'eval-cheap-module-source-map',
	plugins: [
		new VueLoaderPlugin(),
		new RemoveEmptyScriptsPlugin(),
		new MiniCssExtractPlugin( {
			filename: "[name].min.css",
			chunkFilename: "chunks/[name].min.css"
		} ),
		new webpack.DefinePlugin({
			__VUE_OPTIONS_API__: true,
			__VUE_PROD_DEVTOOLS__: false,
		}),
		new webpack.SourceMapDevToolPlugin({
			filename: '[file].map'
		})
	],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './'),
			'leaflet_css': __dirname + "/node_modules/leaflet/dist/leaflet.css",
			'leaflet_layers': __dirname + "/node_modules/leaflet/dist/images/layers.png",
			'leaflet_layers_2x': __dirname + "/node_modules/leaflet/dist/images/layers-2x.png",
			'leaflet_marker': __dirname + "/node_modules/leaflet/dist/images/marker-icon.png",
			'leaflet_marker_2x': __dirname + "/node_modules/leaflet/dist/images/marker-icon-2x.png",
			'leaflet_marker_shadow': __dirname + "/node_modules/leaflet/dist/images/marker-shadow.png"
		}
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /(node_modules|bower_components)/,
				use: [
					{
						loader: 'babel-loader',
						options: {
							presets: ['@babel/env'],
							plugins: ['@babel/plugin-syntax-dynamic-import']
						}
					},
					'source-map-loader'
				]
			},
			{
				test: /\.scss$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: "css-loader",
						options: {
							sourceMap: true
						}
					},
					{
						loader: "sass-loader",
						options: {
							sourceMap: true
						}
					}
				]
			},
			{
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: "css-loader",
						options: {
							url: false,
							sourceMap: true
						}
					}
				]
			},
			{
				test: /\.vue$/,
				loader: 'vue-loader',
				options: {
					loaders: {
						'scss': [
							'vue-style-loader',
							'css-loader',
							'sass-loader'
						],
						'sass': [
							'vue-style-loader',
							'css-loader',
							'sass-loader?indentedSyntax'
						]
					}
				}
			},
			{
				test: /\.(png|jpe?g|gif)$/,
				type: 'asset/resource',
				generator: {
//					filename: '[path][name].[ext]'
					filename: 'asset/[hash].[ext]'
				}
			},
			{
				test: /\.(mp4)$/,
				type: 'asset/resource',
				generator: {
//					filename: '[name].[ext]'
					filename: 'asset/[hash].[ext]'
				}
			},
			{
				test: /^(?!.*(\.c\.svg)).*\.svg$/,
				type: 'asset/resource',
				generator: {
					filename: 'asset/[hash].[ext]'
				}
			},
			{
				test: /\.c.svg$/,
				use: [
					'vue-loader',
					'vue-svg-loader',
				]
			},
			{
				test: /\.(eot|ttf|woff|woff2)(\?.+)?$/,
				type: 'asset/resource',
				generator: {
//					filename: '[name].[ext]'
					filename: 'asset/[hash].[ext]'
				}
			}
		]
	}
};
