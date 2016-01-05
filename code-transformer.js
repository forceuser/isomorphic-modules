// var Cache = require('cache-storage');
// var storage = new (require('cache-storage/Storage/FileSyncStorage'))('./temp');

// var cache = new Cache(storage, 'js-cache');

var fs = require('fs');

require('source-map-support').install();

var registeredExtensions = {};

module.exports.add = function (transformer,extensions,ignore){
    
    var settings = {
        transformer: transformer,
        ignore: ignore
    };
    
    [].concat(extensions).forEach(function(ext){
        
        
        if(registeredExtensions[ext]){
            registeredExtensions[ext].push(settings);
        }else{
            var original = require.extensions[ext];
            registeredExtensions[ext] = [settings];
            require.extensions[ext] = function(module,filename){
                
                var isIgnore = true;
                var transformers = [];
                
                registeredExtensions[ext].forEach(function(e){
                    var ignore = e.ignore;
                    if( ignore&&
                        (((ignore instanceof RegExp)&&ignore.test(filename))||
                        ((typeof ignore === "function")&&ignore(filename)))
                    ){
                        return;
                    }
                    isIgnore = false;
                    transformers.push(e.transformer);
                });
                
                if(isIgnore){
                    original(module,filename)
                }else{
                    var code = fs.readFileSync(filename).toString();
                    //check cache
                    var context = {};
                    
                    transformers.forEach(function(transformer){
                        code = transformer.call(context,code);
                    });
                    
                    //update chache
                
                    module._compile(code, filename); 
                }
            }
        }
    });
}


