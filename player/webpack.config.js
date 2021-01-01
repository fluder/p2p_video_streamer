module.exports = {
    entry: [
        "babel-polyfill",
        "./src/player.js",
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
    mode: "production"
};