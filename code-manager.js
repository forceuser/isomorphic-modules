var Cache = require('cache-storage');
var FileSyncStorage = require('cache-storage/Storage/FileSyncStorage');
var FileAsyncStorage = require('cache-storage/Storage/FileAsyncStorage');
var fs = require('fs');
var path = require('path');

function CodeCache(sync, dir, namespace) {
    var cache;
    //TODO: create cache dir if dont exists
    if (sync) {
        cache = new Cache(new FileSyncStorage(dir || './temp'), namespace);
        this.load = function(path, callback) {
            var data = null;
            try {
                data = cache.load(path);
            }
            catch (e) {
                callback(e, data);
                return;
            }
            callback(null, data);
        };

    }
    else {
        cache = new Cache(new FileAsyncStorage(dir || './temp'), namespace);

        this.load = function(path, callback) {
            cache.load(path, callback);
        };
    }

    this.save = function(path, data, options) {
        cache.save(path, data, options, function() {

        });
    };
};


function CodeLoader(sync) {
    if (sync) {
        this.load = function(path, callback) {
            var code = null;
            try {
                code = fs.readFileSync(path, 'utf8');
            }
            catch (e) {
                callback(e, code);
                return;
            }
            callback(null, code);

        }
    }
    else {
        this.load = function(path, callback) {
            fs.readFile(path, 'utf8', callback);
        }
    }
}


function CodeManager(options) {
    var manager = this;
    var sync = options.compile;
    var cache;
    var loader = new CodeLoader(sync);
    var vars = {};
    var maps = {};

    if (options.cache) {
        cache = new CodeCache(sync, options.cacheDir, options.cache);
    }

    if (options.compile) {
        manager.async = false;
        require('source-map-support').install({
            handleUncaughtExceptions: false,
            retrieveSourceMap: function retrieveSourceMap(filename) {
                var map = maps && maps[filename];
                if (map) {
                    return {
                        url: null,
                        map: map
                    };
                }
                else {
                    return null;
                }
            }
        });
    }else{
        manager.async = true;
    }

    var registeredExtensions = {};

    this.setVar = function(name, value) {
        vars[name] = value;
    }

    this.getVar = function(name) {
        return vars[name];
    }

    this.transform = function(filename, _callback, vars) {
        vars = vars||{};
        var isIgnore = true;
        var transformers = [];
        var ext = path.extname(filename);

        function callback(result, filename, manager, vars) {
            if (result&&result.map) {
                maps[filename] = result.map;
            }
            return _callback && _callback.apply(this, arguments);
        }

        (registeredExtensions[ext] || []).forEach(function(e) {
            var ignore = e.ignore;
            if (ignore &&
                (((ignore instanceof RegExp) && ignore.test(filename)) ||
                    ((typeof ignore === "function") && ignore(filename)))
            ) {
                return;
            }
            isIgnore = false;
            transformers.push(e.transformer);
        });

        if (isIgnore) {
            if (options.compile) {
                callback(null, filename, manager, vars);
            }
            else {
                loader.load(filename, function(err, code) {
                    callback({
                        code: code
                    }, filename, manager, vars);
                });
            }
        }
        else {
            if (options.cache) {
                cache.load(filename, function(err, cached) {
                    if (cached) {
                        callback(cached, filename, manager, vars);
                    }
                    else {
                        load(filename);
                    }
                });
            }
            else {
                load(filename);
            }
        }

        function load(filename) {
            loader.load(filename, function(err, code) {
                if (err) {
                    throw new Error("File not found!");
                }
                var result = {
                    code: code
                };
                vars.cacheDep = [filename];
                if(!options.compile){//async transformation
                
                    var p = Promise.resolve(result);
                    transformers.forEach(function(transformer) {
                        p = p.then(function(result){
                            return transformer.call({}, result, filename, manager, vars) || {};
                        });
                    });
                    
                    p.then(function(result){
                        if (options.cache) {
                            cache.save(filename, result, {
                                files: vars.cacheDep
                            });
                        }
                        
                        callback(result, filename, manager, vars);
                    });
                }else{
                    
                    transformers.forEach(function(transformer) {
                        result = transformer.call({}, result, filename, manager, vars) || {};
                    });
    
                    if (options.cache) {
                        cache.save(filename, result, {
                            files: vars.cacheDep
                        });
                    }
    
                    callback(result, filename, manager, vars);    
                }
                
                
            });
        }

        return manager;
    }
    this.addTransformers = function(transformers){
        (transformers||[]).forEach(function(t){
            manager.addTransformer(t.transformer,t.extensions,t.ignore);
        });
    }
    this.addTransformer = function(transformer, extensions, ignore) {
        var self = this;
        var settings = {
            transformer: transformer,
            ignore: ignore
        };

        [].concat(extensions).forEach(function(ext) {

            if (registeredExtensions[ext]) {
                registeredExtensions[ext].push(settings);
            }
            else {
                registeredExtensions[ext] = [settings];

                if (options.compile) {
                    var original = require.extensions[ext];
                    require.extensions[ext] = function(module, filename) {
                        manager.setVar("mapTarget",filename);
                        self.transform(filename, function(result, filename) {
                            if (!result) {
                                original(module, filename);
                            }
                            else {
                                module._compile(result.code, filename);
                            }
                        });
                    }
                }
            };
        });
        return manager;
    };
};

module.exports = CodeManager;