export const calculateKeys = (keys: {keyName: string,required: boolean,type:string}[],input: {type: string, keys: any}, parentKey?: string, parentArray?: boolean) => {
    for(const key in input.keys){
        let keyName = '';
        if(parentKey) keyName = parentKey;
        if(parentArray) keyName = `${parentKey}[N]`;
        if(keyName !== '') keyName = `${keyName}.`;
        keyName = `${keyName}${key}`;
        const item = input.keys[key];
        const type = item.type;
        const required = item.flags?.presence === 'required' || false;
        keys.push({keyName,type,required});
        if(input.keys[key].type === 'object'){
            calculateKeys(keys,input.keys[key],keyName);
        }
        if(input.keys[key].type === 'array'){
            const items = input.keys[key].items;
            calculateKeys(keys,items[0],keyName,true);
        }
    }
    return keys ;
}

export const calculateAllKeys = (description: any) => {
    const keys = [];
    calculateKeys(keys,description);
    return keys;
}