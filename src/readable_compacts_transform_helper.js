import Long from 'long';
import ByteBuffer from 'bytebuffer';

const findEndBracket = (str) => {
    let index = str.indexOf(']');
    while (str[index - 1] == '\\') {
        index = str.indexOf(']', index + 1);
    }
    return index;
};

const itemFilter = (conditions) => {
    return (item) => {
        if (conditions['id'] != undefined) {
            return item['id'] == conditions['id'];
        } else if (conditions['name'] != undefined) {
            return item['name'] == conditions['name'];
        }
        return false;
    };
};

const getField = (conditions, msgName, mappings) => {
    let fields = mappings.get(msgName);
    if (fields == undefined) {
        throw new Error('No ' + msgName + ' definition:');
    }
    let field = fields.filter(itemFilter(conditions))[0];
    if (field == undefined) {
        throw new Error('Message ' + msgName + ' does not has corresponding field with conditions:' + JSON.stringify(conditions));
    }
    return {
        'id': field['id'],
        'type': field['type'],
        'rule': field['rule'],
        'name': field['name'],
        'keytype':field['keytype'],
    };
};

const getQualifiedMsgName = (msgName, pkgName) => {
    if (msgName.indexOf('.') == -1) {
        if (pkgName != '') {
            msgName = pkgName + '.' + msgName;
        }
    }
    return msgName;
};

const comToLong = (com) =>{
    return new Long(com, 0 , true);
};

const hextoString = (hex) => {
    let bf = ByteBuffer.fromHex(hex);
    return bf.readString(bf.limit);
};

const first16ComsToString = (coms, transform)=>{
    let result ='';
    for (let ii = 0; ii <16 ; ii++){
        let component = coms.shift();
        if (component.toInt() != 0){
            result = result + transform(component);                       }
    }
    return result;
};

const doCompactsReadableMapping = (messageFieldsMapping, msgName, pkgName, compactComponents) => {
    if (compactComponents.length == 0){
        return '';
    }
    let components = [].concat(compactComponents);
    let component = components.shift();
    let qualifiedMsgName = getQualifiedMsgName(msgName, pkgName);
    let field = getField({
        'id': component.toInt()
    }, qualifiedMsgName, messageFieldsMapping);
    let readableName = field['name'];
    let tmp = '';
    if (field['rule'] === 'repeated') {
        readableName = readableName + '[' + components.shift().toString() + ']';
    } else if (field['rule'] === 'map'){
        switch (field['keytype']){
        case 'string':
            tmp = first16ComsToString(components,(com)=>{ return hextoString(com.toString(16));});
            readableName =  readableName + '[' + tmp + ']'; 
            break;
        case 'bytes':
            tmp = first16ComsToString(components,(com)=>{ return com.toString(16);});
            readableName = readableName + '[' + '0x' + tmp + ']';
            break;
        case 'int64':
        case 'int32':
        case 'sint64':
        case 'sint32':
        case 'uint64':
        case 'uint32':
        case 'fixed64':
        case 'fixed32':
            readableName = readableName + '[' + components.shift().toString() + ']';
            break;  
        default:
            throw new Error(`Invalid key type: ${field['keytype']}`);
        }
    }
    let remains = doCompactsReadableMapping(messageFieldsMapping, field['type'], pkgName, components);
    if (remains !='')  {
        readableName = readableName + '.' + remains;
    }   
    return readableName;
};

const strToComponents = (str) =>{
    if (str.length > 128){
        throw new Error(str + ' is too long as a key to map.');
    }
    let result = Array(0);
    let tmp = Array(0);
    for (let ii = 0; ii < str.length; ii++){
        tmp.push(str[ii].charCodeAt());
    }
    tmp = Array(128-tmp.length).fill(0).concat(tmp);
    while (tmp.length >= 8){
        result.push(ByteBuffer.fromBinary(tmp.splice(0,8)).readUint64());
    }
    return result;
};

const decimalStrToComponents = (str) =>{
    let bf = ByteBuffer.fromUTF8(str);
    if (bf.limit > 128){
        throw new Error(str + ' is too long as a key to map.');
    }
    bf.prepend(Array(128-bf.limit).fill(0));
    let result = Array(0);
    while (bf.offset < bf.limit){
        let tmp = bf.readLong();
        tmp.unsigned = true;
        result.push(tmp);
    }
    return result;
};

const hexStrToComponents = (str) =>{
    if (str.match(/^0x/)){
        str = str.substring(2);
    }
    let bf = ByteBuffer.fromHex(str);
    if (bf.limit > 128){
        throw new Error(str + ' is too long as a key to map.');
    }
    bf.prepend(Array(128-bf.limit).fill(0));
    let result = Array(0);
    while (bf.offset < bf.limit){
        result.push(bf.readUint64());
    }
    return result; 
};

const doReadableCompactsMapping = (messageFieldsMapping, msgName, pkgName, readableString) => {
    if (readableString.length  == 0){
        return [];
    }
    let matched = readableString.match(/^\w+/);
    if (matched == null) {
        throw new Error(`"${readableString}": format error`);
    }
    let remainString = readableString.substring(matched[0].length);
    let qualifiedMsgName = getQualifiedMsgName(msgName, pkgName);
    let field = getField({
        'name': matched[0]
    }, qualifiedMsgName, messageFieldsMapping);
    let result = [comToLong(field['id'])];
    if (remainString[0] == '[') {
        let indexOfClose = findEndBracket(remainString);
        let str = remainString.substring(1, indexOfClose);
        remainString = remainString.substring(indexOfClose + 1);
        if (field['rule'] === 'repeated') {
            if (str.match(/^[0-9]+$/)) {
                result = result.concat([comToLong(parseInt(str))]);
            } else {
                throw new Error(str + ' is not a valid index for repeated item.');
            }
        }
        else if (field['rule'] === 'map'){
            switch (field['keytype']){
            case 'string':
                result = result.concat(strToComponents(str));
                break;
            case 'bytes':
                result = result.concat(hexStrToComponents(str));
                break;
            case 'int64':
            case 'int32':
            case 'sint64':
            case 'sint32':
                result.push(Long.fromString(str,false));
                break;
            case 'uint64':
            case 'uint32':
            case 'fixed64':
            case 'fixed32':
                result.push(Long.fromString(str,true));
                break;
            default:
                throw new Error(`Invalid key type: ${field['keytype']}`);
            }
        }else {
            throw new Error(`Invalid field type: ${field['rule']} enclosed by [].`);
        }
    } 
    if (remainString[0] == '.') {
        remainString = remainString.substring(1);
    }
    result =  result.concat(doReadableCompactsMapping(messageFieldsMapping, field['type'], pkgName, remainString));
    return result;
};

const buildMessageNameToFieldsMapping = (jsonMeta, results) => {
    let scope = jsonMeta['package'];
    if ((scope == null) || (scope == undefined)) {
        buildNestedMessageNameToFieldsMapping('', jsonMeta, results);
    } else {
        buildNestedMessageNameToFieldsMapping(scope, jsonMeta, results);
    }
};

const buildNestedMessageNameToFieldsMapping = (scope, jsonMeta, results) => {
    let outer_scope = scope;
    let name = jsonMeta['name'];
    if (name != undefined) {
        if (scope == '') {
            outer_scope = name;
        } else {
            outer_scope = outer_scope + '.' + name;
        }
    }
    if (jsonMeta['isNamespace'] == true) {
        let msgs = jsonMeta['messages'];
        for (let ii in msgs) {
            buildNestedMessageNameToFieldsMapping(outer_scope, msgs[ii], results);
        }
    } else {
        let msgs = jsonMeta;
        for (let ii in msgs) {
            results.set(outer_scope, msgs[ii]);
        }
    }
};

export class TransformHelper {
    constructor(jsonMetaForProto, packageName, msgName) {
        this.messageTypeNameToFields = new Map;
        buildMessageNameToFieldsMapping(jsonMetaForProto, this.messageTypeNameToFields);
        this.msgName = msgName;
        this.pkgName = packageName;
        if (this.messageTypeNameToFields.get(getQualifiedMsgName(msgName,packageName)) == undefined){
            throw new Error(`No "Messsge:"  ${msgName} definition`);
        }
    }
    compactsToReadableString(compactComponents) {
        if (compactComponents.length == 0) {
            return '';
        }
        return doCompactsReadableMapping(this.messageTypeNameToFields, this.msgName, this.pkgName, compactComponents);
    }
    readableStringToCompacts(readableString) {
        if (readableString == '') {
            return [];
        }
        return doReadableCompactsMapping(this.messageTypeNameToFields, this.msgName, this.pkgName, readableString);
    }
}
