var babel = require('babel-core');

module.exports = function(options){
    return function(module){
        return babel.transform(module.code, options);
    }
}