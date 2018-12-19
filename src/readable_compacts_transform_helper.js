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
            return item.id == conditions['id'];
        } else if (conditions['name'] != undefined) {
            return item.name == conditions['name'];
        }
        return undefined;
    };
};
const getField = (condtions, msgName, msgs) => {
    let msg = msgs.filter(itemFilter({
        'name': msgName
    }))[0];
    let fields = msg['fields'];
    let field = msg['fields'].filter(itemFilter(condtions))[0];
    if (field == undefined) {
        throw new Error('Message ' + msgName + ' does not has corresponding field with conditions:' + conditions);
    }
    return {
        'id': field['id'],
        'type': field['type'],
        'rule': field['rule'],
        'name': field['name'],
    };
};
const doCompactsReadableMapping = (msgs, msgName, compactComponents) => {
    let components = [].concat(compactComponents);
    let component = components.shift();
    let field = getField({
        'id': component
    }, msgName, msgs);
    let readableName = field['name'];
    if (components.length > 0) {
        if (field['rule'] === 'repeated') {
            return readableName + '[' + components.shift() + ']' + '.' + doCompactsReadableMapping(msgs, field['type'], components);
        } else {
            return readableName + '.' + doCompactsReadableMapping(msgs, field['type'], components);
        }
    }
    return readableName;
};
const doReadableCompactsMapping = (msgs, msgName, readableString) => {
    let matched = readableString.match(/^\w*/);
    if ((matched == null) || (matched[0] == '')) {
        throw new Error(`${readableString} format error`);
    }
    let remainString = readableString.substring(matched[0].length);
    let field = getField({
        'name': matched[0]
    }, msgName, msgs);
    let result = [field['id']];
    while (remainString.length > 0) {
        if (remainString[0] == '.') {
            remainString = remainString.substring(1);
            return result.concat(doReadableCompactsMapping(msgs, field['type'], remainString));
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

export class TransformHelper {
    constructor(jsonMetaForProto, packageName, msgName) {
        //deal with condition when this proto does not import other proto definition
        if (jsonMetaForProto['package'] == packageName) {
            this.msgsFormat = jsonMetaForProto.messages;
        }
        if (this.msgsFormat == undefined) {
            this.msgsFormat = jsonMetaForProto.messages.filter(itemFilter({
                'name': packageName
            }))[0].messages;
        }
        if (this.msgsFormat == undefined){
            throw new Error('json meta format does not match with provided package name');
        }
        let msg = this.msgsFormat.filter(itemFilter({
            'name': msgName
        }))[0];
        if (msg ==undefined){
            throw new Error('Message:' + msgName + ' does not exist!');
        }
        this.msgName = msgName;
    }
    compactsToReadableString(compactComponents) {
        if (compactComponents.length == 0) {
            return '';
        }
        return doCompactsReadableMapping(this.msgsFormat, this.msgName, compactComponents);
    }
    readableStringToCompacts(readableString) {
        if (readableString == '') {
            return [];
        }
        return doReadableCompactsMapping(this.msgsFormat, this.msgName, readableString);
    }
}