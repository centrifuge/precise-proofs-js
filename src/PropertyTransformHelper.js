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

const readString = (length, compacts) =>{
    let buf = compacts.buffer;
    let i = compacts.offset;
    let j = compacts.offset;
    while (buf[i] == 0){
        i++;
    }
    compacts.offset = i;
    return compacts.readString(length - i + j, ByteBuffer.METRICS_BYTES);
};

const doCompactPropertyLiteralMapping = (messageFieldsMapping, msgName, pkgName, compacts) => {
    if (compacts.remaining() == 0){
        return '';
    }
    let tagNumber = compacts.readUint32();
    let qualifiedMsgName = getQualifiedMsgName(msgName, pkgName);
    let field = getField({
        'id': tagNumber
    }, qualifiedMsgName, messageFieldsMapping);
    let literal = field['name'];
    if (field['rule'] === 'repeated') {
        literal = literal + '[' + compacts.readUint32() + ']';
    } else if (field['rule'] === 'map'){
        let keyLength;
        switch (field['keytype']){
        case 'string':
            keyLength = field['options'][`${maxKeyLengthOptionName}`];
            literal =  literal + '[' + readString (keyLength, compacts) + ']';
            break;
        case 'bytes':
            keyLength = field['options'][`${maxKeyLengthOptionName}`];
            literal = literal + '[' + '0x' + compacts.toHex(compacts.offset, compacts.offset + keyLength) + ']';
            compacts.offset = compacts.offset + keyLength;
            break;
        case 'int64':
        case 'sint64':
            literal = literal + '[' + compacts.readInt64() + ']';
            break;
        case 'int32':
        case 'sint32':
            literal = literal + '[' + compacts.readInt32() + ']';
            break;
        case 'uint64':
        case 'fixed64':
            literal = literal + '[' + compacts.readUint64() + ']';
            break;
        case 'uint32':
        case 'fixed32':
            literal = literal + '[' + compacts.readUint32() + ']';
            break;
        default:
            throw new Error(`Invalid key type: ${field['keytype']}`);
        }
    }
    let remains = doCompactPropertyLiteralMapping(messageFieldsMapping, field['type'], pkgName, compacts);
    if (remains !='')  {
        literal = literal + '.' + remains;
    }
    return literal;
};

const maxKeyLengthOptionName = '(proofs.key_length)';
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
    let result = new ByteBuffer();
    result.writeUint32(field['id']);
    if (remainString[0] == '[') {
        let indexOfClose = findEndBracket(remainString);
        let str = remainString.substring(1, indexOfClose);
        remainString = remainString.substring(indexOfClose + 1);
        if (field['rule'] === 'repeated') {
            if (str.match(/^[0-9]+$/)) {
                result.writeUint32(parseInt(str));
            } else {
                throw new Error(str + ' is not a valid index for repeated item');
            }
        }
        else if (field['rule'] === 'map'){
            let maxKeyLength;
            let bf;
            switch (field['keytype']){
            case 'string':
                maxKeyLength = field['options'][`${maxKeyLengthOptionName}`];
                bf = ByteBuffer.wrap(str);
                if (bf.limit > maxKeyLength){
                    throw new Error(str + ' is too long as a key to map');
                }
                bf.prepend(Array(maxKeyLength-bf.limit).fill(0));
                result.append(bf);
                break;
            case 'bytes':
                maxKeyLength = field['options'][`${maxKeyLengthOptionName}`];
                if(str.length != maxKeyLength*2 + 2){
                    throw new Error(str + ' length is invalid');
                }
                if (str.match(/^0x/)){
                    str = str.substring(2);
                }else{
                    throw new Error(str + ' should start with 0x');
                }
                result.append(ByteBuffer.fromHex(str));
                break;
            case 'int64':
            case 'sint64':
                result.writeLong(Long.fromString(str,false));
                break;
            case 'int32':
            case 'sint32':
                result.writeInt32(parseInt(str));
                break;
            case 'uint64':
            case 'fixed64':
                result.writeLong(Long.fromString(str,true));
                break;
            case 'uint32':
            case 'fixed32':
                result.writeUint32(parseInt(str));
                break;
            default:
                throw new Error(`Invalid key type: ${field['keytype']}`);
            }
        }else {
            throw new Error(`Invalid field type: ${field['rule']} enclosed by []`);
        }
    }
    if (remainString[0] == '.') {
        remainString = remainString.substring(1);
    }
    let tmp = doLiteralCompactPropertyMapping(messageFieldsMapping, field['type'], pkgName, remainString);
    return Array.from((new Uint8Array(result.buffer)).slice(0,result.offset)).concat(tmp);
};

const buildMessageNameToFieldsMapping = (jsonMeta, results) => {
    let scope = jsonMeta['package'];
    if ((scope == null) || (scope == undefined)) {
        buildQualifiedMessageNameToFieldsMapping('', jsonMeta, results);
    } else {
        buildQualifiedMessageNameToFieldsMapping(scope, jsonMeta, results);
    }
};

const buildQualifiedMessageNameToFieldsMapping = (scope, jsonMeta, results) => {
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
            buildQualifiedMessageNameToFieldsMapping(outer_scope, msgs[ii], results);
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
 * @param {byte[]} parentPrefixCompact - Compact Parent Prefix specified in the TreeOptions of golang side
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
 * @param {byte[]} compactPropertyComponents - Compact to be transformed
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
        return doCompactPropertyLiteralMapping(this.messageTypeNameToFields, this.msgName, this.pkgName, ByteBuffer.wrap(remainComs));
    }

    /**
 * Transform Literal string format to compact format
 * @public
 * @instance
 * @function
 * @param {string} literal - Literal string to be transformed
 * @return {byte[]} Transformed Compact
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
