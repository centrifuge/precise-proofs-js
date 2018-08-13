import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup';

let pkg = require('./package.json');
let external = Object.keys(pkg.dependencies);

let plugins = [
    babel(babelrc()),
];



export default {
    input: 'src/index.js',
    plugins: plugins,
    external: external,
    output: [
        {
            file: pkg.main,
            format: 'cjs',
            sourceMap: true
        },
        {
            file: pkg.module,
            format: 'es',
            sourceMap: true
        }
    ]
}
