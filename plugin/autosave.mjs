// The host controller serializes writes. Post each committed snapshot immediately
// so leaving this iframe cannot discard a commit waiting behind an acknowledgement.
export function createAutoSave({save,onSaved=()=>{},onError=()=>{}}) {
  let generation=0,lastKey,pending,failed=false,disposed=false;
  return {
    setBaseline(value){generation++;lastKey=JSON.stringify(value);pending=undefined;failed=false;},
    submit(value){
      if(disposed)return Promise.resolve(false);
      const key=JSON.stringify(value);
      if(key===lastKey&&!failed)return pending||Promise.resolve(true);
      const captured=++generation;lastKey=key;failed=false;
      let operation;
      try{operation=save(structuredClone(value));}catch(error){operation=Promise.reject(error);}
      pending=Promise.resolve(operation).then(()=>{
        if(captured===generation&&!disposed){failed=false;onSaved();}return true;
      },error=>{
        if(captured===generation&&!disposed){failed=true;onError(error);}return false;
      });
      return pending;
    },
    invalidate(){generation++;lastKey=undefined;failed=false;},
    dispose(){disposed=true;generation++;}
  };
}
