const path = require('path');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');

module.exports = {
    entry: {
        app: './src/index.js',
    },
    devServer: {
        port: 9000
    },
    plugins: [
        new CleanWebpackPlugin(),
        new MiniCssExtractPlugin(),
        new HtmlWebpackPlugin({
            // favicon: 'favicon.ico',
            template: './src/template.html',
            inlineSource: '.(js|css)$',
            // minify: {
            //     collapseWhitespace: true,
            //     removeComments: true,
            //     // removeRedundantAttributes: true,
            //     removeScriptTypeAttributes: true,
            //     removeStyleLinkTypeAttributes: true,
            //     useShortDoctype: true
            // },
        }),
        new HtmlWebpackInlineSourcePlugin()
    ],
    module: {
        rules: [

            {test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader']},
            {
                test: require.resolve("zepto"),
                use: "imports-loader?this=>window"
            }
        ]
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
};
