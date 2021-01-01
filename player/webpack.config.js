module.exports = {
    entry: [
        "babel-polyfill",
        "./src/index.js",
    ],
    output: {
        filename: "player.js"
    },
    module: {
        rules: [
            {
                test: /.js$/,
                loader: "babel-loader",
                options: {
                    presets: ["@babel/preset-env"]
                }
            }
        ]
    },
    mode: "development"
};