const scopes=new WeakMap();
export function listenScoped(root,target,type,listener,options={}){
 let controller=scopes.get(root);
 if(!controller){controller=new (root.ownerDocument.defaultView.AbortController)();scopes.set(root,controller);root.dataset.eventScope='';}
 target.addEventListener(type,listener,{...(typeof options==='boolean'?{capture:options}:options),signal:controller.signal});
}
export function disposeEventScope(root){
 scopes.get(root)?.abort();scopes.delete(root);
 for(const child of root.querySelectorAll('[data-event-scope]')){scopes.get(child)?.abort();scopes.delete(child);}
}
