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
        throw new Error('Message ' + msgName + ' does not have corresponding field with conditions:' + JSON.stringify(conditions));
    }
    return {
        'id': field['id'],
        'type': field['type'],
        'rule': field['rule'],
        'name': field['name'],
        'keytype':field['keytype'],
        'options':field['options'],
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

const firstComsToString = (nums, coms, transform)=>{
    let result ='';
    for (let ii = 0; ii <nums ; ii++){
        let component = coms.shift();
        if (component.toInt() != 0){
            result = result + transform(component);                       }
    }
    return result;
};

const doCompactPropertyLiteralMapping = (messageFieldsMapping, msgName, pkgName, compactPropertyComponents) => {
    if (compactPropertyComponents.length == 0){
        return '';
    }
    let components = [].concat(compactPropertyComponents);
    let component = components.shift();
    let qualifiedMsgName = getQualifiedMsgName(msgName, pkgName);
    let field = getField({
        'id': component.toInt()
    }, qualifiedMsgName, messageFieldsMapping);
    let literal = field['name'];
    let tmp = '';
    if (field['rule'] === 'repeated') {
        literal = literal + '[' + components.shift().toString() + ']';
    } else if (field['rule'] === 'map'){
        let comsLength = 16;
        switch (field['keytype']){
        case 'string':
            comsLength = field['options'][`${maxKeyLengthOptionName}`]/8;
            tmp = firstComsToString(comsLength,components,(com)=>{ return hextoString(com.toString(16));});
            literal =  literal + '[' + tmp + ']';
            break;
        case 'bytes':
            comsLength = field['options'][`${maxKeyLengthOptionName}`]/8;
            tmp = firstComsToString(comsLength,components,(com)=>{ return com.toString(16);});
            literal = literal + '[' + '0x' + tmp + ']';
            break;
        case 'int64':
        case 'int32':
        case 'sint64':
        case 'sint32':
        case 'uint64':
        case 'uint32':
        case 'fixed64':
        case 'fixed32':
            literal = literal + '[' + components.shift().toString() + ']';
            break;
        default:
            throw new Error(`Invalid key type: ${field['keytype']}`);
        }
    }
    let remains = doCompactPropertyLiteralMapping(messageFieldsMapping, field['type'], pkgName, components);
    if (remains !='')  {
        literal = literal + '.' + remains;
    }
    return literal;
};

const strToComponents = (str, maxLength) =>{
    if (str.length > maxLength){
        throw new Error(str + ' is too long as a key to map.');
    }
    let result = Array(0);
    let tmp = Array(0);
    for (let ii = 0; ii < str.length; ii++){
        tmp.push(str[ii].charCodeAt());
    }
    tmp = Array(maxLength-tmp.length).fill(0).concat(tmp);
    while (tmp.length >= 8){
        result.push(ByteBuffer.fromBinary(tmp.splice(0,8)).readUint64());
    }
    return result;
};

const hexStrToComponents = (str, maxLength) =>{
    if (str.match(/^0x/)){
        str = str.substring(2);
    }
    let bf = ByteBuffer.fromHex(str);
    if (bf.limit > maxLength){
        throw new Error(str + ' is too long as a key to map.');
    }
    bf.prepend(Array(maxLength - bf.limit).fill(0));
    let result = Array(0);
    while (bf.offset < bf.limit){
        result.push(bf.readUint64());
    }
    return result;
};
const maxKeyLengthOptionName = '(proofs.key_max_length)';
const doLiteralCompactPropertyMapping = (messageFieldsMapping, msgName, pkgName, literal) => {
    if (literal.length  == 0){
        return [];
    }
    let matched = literal.match(/^\w+/);
    if (matched == null) {
        throw new Error(`"${literal}": format error`);
    }
    let remainString = literal.substring(matched[0].length);
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
                result = result.concat(strToComponents(str,field['options'][`${maxKeyLengthOptionName}`]));
                break;
            case 'bytes':
                result = result.concat(hexStrToComponents(str,field['options'][`${maxKeyLengthOptionName}`]));
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
    result =  result.concat(doLiteralCompactPropertyMapping(messageFieldsMapping, field['type'], pkgName, remainString));
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
const removeCompactPrefix = (prefix, coms) =>{
    if (coms.length <= prefix.length){
        throw new Error('compactProperty\'s length should be bigger than prefix\'length ');
    }
    for(let ii = 0; ii < prefix.length; ii++)
    {
        if (prefix[ii] != coms[ii]){
            throw new Error(`compactProperty ${coms} does not start with compact prefix ${prefix}`);
        }
    }
    let result = [].concat(coms);
    result.splice(0,prefix.length);
    return result;
};
const removeLiteralPrefix = (prefix, literal) =>{
    if (! literal.startsWith(prefix)){
        throw new Error(`Literal:${literal} does not start with prefix: ${prefix} `);
    }
    return literal.substring(prefix.length+1);
};

export class PropertyTransformHelper {
/**
 * Helper class used to transform between literal format and comact format for
 * property contained in proof generated by Go side
 * @module PropertyTransformHelper
 * @constructor
 * @param {string} jsonMetaForProto - Json definition of the .proto file, should be generated by pbjs cli from protobufjs
 * @param {string} packageName - Package name of the message
 * @param {string} msgName - Message name of the proof's property to be transformed
 * @param {string} parentPrefixLiteral - Literal Parent Prefix specified in the TreeOptions of golang side
 * @param {Long[]} parentPrefixCompact - Compact Parent Prefix specified in the TreeOptions of golang side
*/
    constructor(jsonMetaForProto, packageName, msgName, parentPrefixLiteral, parentPrefixCompact) {
        this.messageTypeNameToFields = new Map;
        buildMessageNameToFieldsMapping(jsonMetaForProto, this.messageTypeNameToFields);
        this.msgName = msgName;
        this.pkgName = packageName;
        this.parentPrefixLiteral = parentPrefixLiteral;
        this.parentPrefixCompact = parentPrefixCompact;
        if (this.parentPrefixLiteral == undefined){
            this.parentPrefixLiteral ='';
        }
        if (this.parentPrefixCompact == undefined){
            this.parentPrefixCompact =[];
        }
        if (this.messageTypeNameToFields.get(getQualifiedMsgName(msgName,packageName)) == undefined){
            throw new Error(`No "Messsge:"  ${msgName} definition`);
        }
    }

    /**
 * Transform Compact format to literal string format
 * @public
 * @instance
 * @function
 * @param {Long[]} compactPropertyComponents - Compact to be transformed
 * @return {string} Transformed Literal String
 */
    compactPropertyToLiteral(compactPropertyComponents) {
        if (compactPropertyComponents.length == 0) {
            return '';
        }
        let remainComs = compactPropertyComponents;
        if (this.parentPrefixCompact.length != 0){
            remainComs = removeCompactPrefix(this.parentPrefixCompact, compactPropertyComponents);
        }
        return doCompactPropertyLiteralMapping(this.messageTypeNameToFields, this.msgName, this.pkgName, remainComs);
    }

    /**
 * Transform Literal string format to compact format
 * @public
 * @instance
 * @function
 * @param {string} literal - Literal string to be transformed
 * @return {Long[]} Transformed Compact
 */
    literalToCompactProperty(literal) {
        if (literal == '') {
            return [];
        }
        let remainLiteral = literal;
        if (this.parentPrefixLiteral.length != 0){
            remainLiteral = removeLiteralPrefix(this.parentPrefixLiteral, literal);
        }
        return doLiteralCompactPropertyMapping(this.messageTypeNameToFields, this.msgName, this.pkgName, remainLiteral);
    }
}
