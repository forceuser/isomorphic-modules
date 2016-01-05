var template = require("babel-template");

var requireAsyncTemplate = template(`
    (function(moduleId){
        return new Promise(function(resolve,reject){
            try{
                if(Array.isArray(moduleId)){
                    Promise.all(moduleId.map(require)).then(resolve,reject);
                }else{
                    Promise.resolve(require(moduleId)).then(resolve);
                }
            }catch(e){
                console.log(e);
                reject(e);
            }
        });
    })
`);

module.exports = function(babel) {
    var t = babel.types;

    return {
        visitor: {
            CallExpression: function(path, state) {

                var callee = path.get('callee');
                if (callee && callee.matchesPattern('require.async')) {
                    var ref = requireAsyncTemplate().expression;
                    var uid = state.file.scope.generateUidIdentifier('requireAsync');


                    if (t.isFunctionExpression(ref) && !ref.id) {
                        ref.body._compact = true;
                        ref._generated = true;
                        ref.id = uid;
                        ref.type = "FunctionDeclaration";
                        state.file.path.unshiftContainer("body", ref);
                    }
                    else {
                        ref._compact = true;
                        state.file.scope.push({
                            id: uid,
                            init: ref,
                            unique: true
                        });
                    }


                    callee.replaceWith(
                        uid
                    );
                }
            }
        }
    };
};