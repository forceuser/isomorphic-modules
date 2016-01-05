ModuleLoader = (function() {
    
    var ignore = [/\/~\/(zlib|tty|fs|url|buffer|assert|http|https|net|util)$/];
    
    var path = {
        dir: function(path) {
            return this.normalize(path).replace(/(\/[^\/]+?)$/, '');
        },
        resolve: function(path) {
            var parts = this.normalize(path).split('/');
            var res = [];
            parts.forEach(function(item) {
                if (item === '..' && res.length) {
                    res.pop();
                }
                else if (item !== '.') {
                    res.push(item);
                }
            })
            return res.length ? res.join("/") : '';
        },
        normalize: function(path) {
            return (path || '').replace(/(\\)/igm, '/').replace(/(\/+)/igm, '/').replace(/(\/)$/, '');
        },
        join: function() {
            var parts = Array.apply(null, arguments);
            var res = [];
            parts.forEach(function(item) {
                if (item) {
                    if (item.indexOf('/') === 0) {
                        res.length = 0;
                    }
                    res.push(item);
                }
            });
            return this.normalize(res.join('/'));
        }
    };


    function httpGet(url) {
        return new Promise(
            function(resolve, reject) {
                var request = new XMLHttpRequest();
                request.onreadystatechange = function() {
                    if (this.status && this.readyState === 4) {
                        if (this.status === 200) {
                            resolve(this.response);
                        }
                        else {
                            reject(new Error(this.statusText));
                        }
                    }
                }
                request.onerror = function() {
                    reject(new Error(
                        'XMLHttpRequest Error: ' + this.statusText));
                };
                request.open('GET', url);
                request.send();
            });
    }
    

    function ModuleLoader(__dirname) {
        var defaults = {};
        
        function resolveModuleId(moduleId){
            var relative = false;

            if (moduleId.match(/^\.\//) || moduleId.match(/^\.\.\//) || moduleId.match(/^\//)) {
                moduleId = '.' + path.resolve(path.join(__dirname, moduleId));
                relative = true;
            }
            
            return {
                relative: relative,
                moduleId: moduleId
            };
        }
        
        
        var require = function(moduleId){
            var resolved = resolveModuleId(moduleId);
            moduleId = resolved.moduleId;
            
            if(moduleId in ModuleLoader.cache){
                if(ModuleLoader.cache[moduleId] instanceof Error){
                    throw ModuleLoader.cache[moduleId];
                }else{
                    ModuleLoader.cache[moduleId].execute();
                    return ModuleLoader.cache[moduleId].exports;
                }
            }else{
                console.warn('Module "'+moduleId+'" was not loaded in commonjs compatible mode, empty object will be returned!')
                return {};
            }
        };
        
    
        require.async = function (moduleId,returnError) {
            if(Array.isArray(moduleId)){
                var moduleIds = moduleId;
                
                return Promise.all(moduleIds.map(function(moduleId){
                    return require.async(moduleId);
                }));
            }
            
            
            var resolved = resolveModuleId(moduleId);
            moduleId = resolved.moduleId;

            if (ModuleLoader.cache[moduleId]) {
                return Promise.resolve((ModuleLoader.cache[moduleId] || {}).exports);
            }
            else {
                var promise = ModuleLoader.promises[moduleId];
                if (!promise) {
                    promise = new Promise(function(resolve, reject) {

                        //load and evaluate
                        var url = moduleId;
                        var fullPath = (resolved.relative?'':__dirname+'/~/') + url.replace(/^\./,'');
                        url = path.normalize(ModuleLoader.baseUrl) + fullPath;
                        var request;
                        
                        if(ignore.some(function(rule){return rule.test(fullPath);})){
                            request = Promise.resolve('');
                        }else{
                            request = httpGet(url);
                        }
                        
                        
                        request.then(function(response) {
                            var moduleInfo = {};
                            
                            var source = response.replace(/\/\/#\s*?moduleInfo=(.*?)$/igm,function(match, p1, offset, string){
                                if(p1){
                                    moduleInfo = JSON.parse(p1);
                                }
                                return '';
                            }).trim();

                            
                            ModuleLoader.register(moduleInfo.id,moduleInfo.filename,source).then(function(){
                                if(!returnError){
                                    ModuleLoader.cache[moduleId].execute();
                                }
                                Promise.resolve((ModuleLoader.cache[moduleId] || {}).exports).then(resolve);
                            });
                        }, function(response) {
                            var error = new Error('Module "'+moduleId+'" can\'t be loaded!');
                            
                            if(returnError){
                                ModuleLoader.cache[moduleId] = error;
                                resolve(error);
                            }else{
                                reject(error);
                            }
                            
                        });
                    });
                    ModuleLoader.promises[moduleId] = promise;
                }
                return promise;
            }
        }

        return require;
    }


    ModuleLoader.promises = [];
    ModuleLoader.context = window;
    ModuleLoader.cache = [];
    ModuleLoader.register = function(id, __filename, source) {
        var __dirname = path.dir(__filename);
        var exports = {};
        var module = {
            id: id,
            exports: exports
        };

        ModuleLoader.cache[module.id] = module;
        var require = ModuleLoader(__dirname);

        var deps = [];
        source.replace(/(?:^|[^\w\$_.])require\s*\(\s*["']([^"']*)["']\s*\)/g, function (_, id) {
            deps.push(id);
        });
        
        
        return Promise.all(deps.map(function(moduleId){
            return require.async(moduleId,true);
        })).then(function(){
            
            module.execute = function(){
                if(!module.executed){
                    
                    var transpiled = ~source.indexOf('# sourceMappingURL');
                    
                    var code = 'with(window.__context){(function(){'+source+'\n})();}'+'\n//# sourceURL='+(window.location.origin+__filename)+(transpiled?'!transpiled':'');
                    var context = window.__context;
                    window.__context = {
                        require: require,
                        module: module,
                        __filename: __filename,
                        __dirname: __dirname,
                        exports: exports,
                        global: window
                    }
                    
                    var script = document.createElement("script");
                    script.text = code;
                    var head = document.head || document.body || document.documentElement;
                    var onerror = window.onerror;
                    var error;
                    window.onerror = function(e) {
                        error = e;
                    }
                    module.executed = true;
                    head.appendChild(script);
                    head.removeChild(script);
                    
                    
                    window.onerror = onerror;
                    window.__context = context;
                    if (error){
                        throw error;
                    }
                }
            };
        });
    };
    
    return ModuleLoader;
})();