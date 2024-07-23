module.exports = () => {
  return {
    plugins: [
      require("postcss-inline-svg")({ paths: ["./src", "./node_modules"] }),
      require("postcss-svgo"),
      require("postcss-combine-duplicated-selectors"),
      require("postcss-normalize"),
    ],
  };
};
