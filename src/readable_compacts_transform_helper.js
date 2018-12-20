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
const doCompactsReadableMapping = (messageFieldsMapping, msgName, pkgName, compactComponents) => {
    let components = [].concat(compactComponents);
    let component = components.shift();
    let qualifiedMsgName = getQualifiedMsgName(msgName, pkgName);
    let field = getField({
        'id': component
    }, qualifiedMsgName, messageFieldsMapping);
    let readableName = field['name'];
    if (components.length > 0) {
        if (field['rule'] === 'repeated') {
            return readableName + '[' + components.shift() + ']' + '.' + doCompactsReadableMapping(messageFieldsMapping, field['type'], pkgName, components);
        } else {
            return readableName + '.' + doCompactsReadableMapping(messageFieldsMapping, field['type'], pkgName, components);
        }
    }
    return readableName;
};
const doReadableCompactsMapping = (messageFieldsMapping, msgName, pkgName, readableString) => {
    let matched = readableString.match(/^\w*/);
    if ((matched == null) || (matched[0] == '')) {
        throw new Error(`${readableString} format error`);
    }
    let remainString = readableString.substring(matched[0].length);
    let qualifiedMsgName = getQualifiedMsgName(msgName, pkgName);
    let field = getField({
        'name': matched[0]
    }, qualifiedMsgName, messageFieldsMapping);
    let result = [field['id']];
    while (remainString.length > 0) {
        if (remainString[0] == '.') {
            remainString = remainString.substring(1);
            return result.concat(doReadableCompactsMapping(messageFieldsMapping, field['type'], pkgName, remainString));
        } else if (remainString[0] == '[') {
            if (field['rule'] != 'repeated') {
                throw new Error('Field:' + field['name'] + ' is not a repeated item.');
            }
            let indexOfClose = findEndBracket(remainString);
            let str = remainString.substring(1, indexOfClose);
            if (str.match(/^[0-9]*$/)) {
                result = result.concat([parseInt(str)]);
            } else {
                throw new Error(str + ' is not a valid index for repeated item.');
            }
            remainString = remainString.substring(indexOfClose + 1);
        } else {
            throw new Error(`${readableString} : ${remainString} format error`);
        }
    }
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
