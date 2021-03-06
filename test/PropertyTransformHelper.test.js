import {PreciseProofs, PropertyTransformHelper} from "../src/index";

    let transformHashes = (hashes) =>{
        let result = new Array();
        for (let item in hashes)
        {
           if (hashes[item].left != null){
               result.push({"left" : '0x'+ hashes[item].left.toHex()})
           }else if (hashes[item].right != null){
               result.push({"right" : '0x' + hashes[item].right.toHex()})
           }
        }
        return result
    }

describe('Property Transform Helper', () => {

    let ProtoBuf = require('protobufjs');

    //encoded by golang side for BytesKeyEntries with proof for entries[0xa101010101010101010102020202020202020202] = value (compactProperty mode off)
    let proofHexStrWithLiteral = "120576616c75651a2038477131dfee2871da9bdf99451482d5b0990ca8645af17766f54795f8172d9522220a20d7966b5b103ff4983f9d25813e363df841ecfe11c3c68b50282acecf3319c4633a33656e74726965735b3078613130313031303130313031303130313031303130323032303230323032303230323032303230325d";

    //encoded by golang side for BytesKeyEntries with proof for entries[0xa101010101010101010102020202020202020202] = value (compactProperty mode on)
    let proofHexStrWithCompactProperty ="120576616c75651a208f141d3aca85fe43cc300c09d6a2e04cd946dffbe1c7209acac86df00d28e0dd22220a2066dd75bd1ef1ff6822586f80caadaa1c56868a12adbd251189aaf36b550feaf04a1800000001a101010101010101010102020202020202020202"

    //encoded by golang side for BytesKeyEntries with proof for entries[0x0101010101010101010102020202020202020202] = value (compactProperty mode off, parent prefix is org.precise [55,56])
    let proofHexStrWithLiteralAndParentPrefix = "120576616c75651a205a8578fd99ca76e3525bba1c2f818e36e194a59c4f45299c489342791dfce34422220a20ad42dadf06d3b768f8b06de5616b162fcfa460b2306946ab18e21cc0342c4d3a3a3f6f72672e707265636973652e656e74726965735b3078613130313031303130313031303130313031303130323032303230323032303230323032303230325d";

    let targetLiteralProperty = 'entries[0xa101010101010101010102020202020202020202]';
    let targetCompactProperty = [0,0,0,1,  0xa1,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x02,0x02,0x02,0x02,0x02,0x02,0x02,0x02,0x02,0x02];
    let proofParser = ProtoBuf.loadJson(require('./proof.json')).build("proofs.Proof");
    let proofWithLiteral = proofParser.decodeHex(proofHexStrWithLiteral);
    let proofWithLiteralAndParentPrefix = proofParser.decodeHex(proofHexStrWithLiteralAndParentPrefix);
    let proofWithCompactProperty = proofParser.decodeHex(proofHexStrWithCompactProperty);
    let hexProof = {
        "property": new PropertyTransformHelper(require('./examples.json'), "documents", "BytesKeyEntries").compactPropertyToLiteral(targetCompactProperty),
        "value": proofWithLiteral.value,
        "salt":  proofWithLiteral.salt.toHex(),
        "hashes": transformHashes(proofWithLiteral.hashes)
    }

    let hexProofWithParentPrefix = {
        "property":  proofWithLiteralAndParentPrefix.readable_name,
        "value": proofWithLiteralAndParentPrefix.value,
        "salt":  proofWithLiteralAndParentPrefix.salt.toHex(),
        "hashes": transformHashes(proofWithLiteralAndParentPrefix.hashes)
    }

    let rootHashWithLiteral = "b4828dc5d3580cb17f22d206e764084a26dbf4a424ae569ca27eae3d4d9d951a"
    let rootHashWithParentPrefix = "9f59a8da013b95326efa087d520e8ec7e8f02eb4e99dcaff7e07716f6accdc05"

    it('proof generated by Golang (with compactProperty off) should be validated by js side', () => {
        expect(hexProof.property).toEqual(targetLiteralProperty)
        expect(hexProof.value).toEqual('value')
        expect((new PreciseProofs()).isValidField(hexProof, rootHashWithLiteral)).toEqual(true)
    });

    it('compactProperty of proof generated by golang (with compactProperty on) should  be decoded sucessfully', () => {
        let compacts = Array.from((new Uint8Array(proofWithCompactProperty.compact_name.buffer).slice(proofWithCompactProperty.compact_name.offset,proofWithCompactProperty.compact_name.limit)));
        let transformedLiteral = new PropertyTransformHelper(require('./examples.json'), "documents", "BytesKeyEntries").compactPropertyToLiteral(compacts);
        expect(transformedLiteral).toEqual(targetLiteralProperty);
    });

    it('when proof contains parent prefix should transform literal to compact correctly if parent prefix is provided', () => {
        let tmpLiteral = proofWithLiteralAndParentPrefix.readable_name ;
        expect(new PropertyTransformHelper(require('./examples.json'), "documents", "BytesKeyEntries", "org.precise").literalToCompactProperty(tmpLiteral)).toEqual(targetCompactProperty)
        expect((new PreciseProofs()).isValidField(hexProofWithParentPrefix, rootHashWithParentPrefix)).toEqual(true)
    });

    let packageName = "test";
    let msgName = "Total";
    let jsonMetaFormat = require('./test_with_import.json');

    let literal = 'items[513].items[2].cents[5].cents';
    let literalPrefix='org.precise'
    let compactPrefix = [55, 66]
    let literalWithPrefix = literalPrefix + '.' + literal;
    let literalWithErrorPrefix = 'org.precises' + '.' + literal;
    let compactProperty = [0,0,0,2,  0,0,0,0,0,0,0x02,0x01,  0,0,0,2,   0,0,0,0,0,0,0,2,  0,0,0,4, 0,0,0,0,0,0,0,5,  0,0,0,2];
    let compactPropertyWithPrefix = compactPrefix.concat(compactProperty);
    let compactPropertyWithErrorPrefix = [55, 77].concat(compactProperty);

    let literalForStringMap2='itemMap[abc].name';
    let compactPropertyForStringMap2 = [0,0,0,3,  0,0,0,0,0,0x61,0x62,0x63,  0,0,0,1];

    let literalForStringMap='itemMap[a测试].name';
    let longKeyLiteralForStringMap = 'itemMap[abcasdasdahjdfdhsjhadhahdahdajsdjahjfssdjjjhshfshjsjfhsjahashdakjsdhadjkasdhashdahsdhaksdkhsajkdhajasdhajsdkjakjsdjadsjadjadjjajahadhsjdahjasdhahd].name';
    let compactPropertyForStringMap = [0,0,0,3,   0,0x61,0xe6,0xb5,0x8b,0xe8,0xaf,0x95,  0,0,0,1];

    let literalForUint64Map='itemMap3[567].name';
    let compactPropertyForUint64Map = [0,0,0,5,  0,0,0,0,0,0,0x02,0x37,  0,0,0,1];

    let literalForInt64Map='itemMap4[-4567].name';
    let compactPropertyForInt64Map = [0,0,0,6,  0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xEE,0x29,  0,0,0,1];

    let literalWithImport = 'items[513].items[2].cents[5].value.name';
    let compactPropertyWithImport = [0,0,0,2,  0,0,0,0,0x00,0x00,0x02,0x01,  0,0,0,2,  0,0,0,0,0,0,0,2,  0,0,0,4,  0,0,0,0,0,0,0,5,  0,0,0,3,  0,0,0,1];

    let errorLiteral1 = 'name[513].items[2].cents[5].cents';
    let errorLiteral2 = 'items[513].items[2].cents[5].cen';
    let errorLiteral3 = 'items[51a3].items[2].cents[5].cents';
    let errorLiteral4 = '[51a3].items[2].cents[5].cents';
    let errorLiteral5 = '.items[2].cents[5].cents';

    let errorCompactProperty1 = [0,0,0,8,  0,0,0,0,0,0,0x02,0x01,  0,0,0,2,   0,0,0,0,0,0,0,2,  0,0,0,4,   0,0,0,0,0,0,0,5,   0,0,0,2];
    let errorCompactProperty2 = [0,0,0,2,  0,0,0,0,0,0,0x02,0x01,  0,0,0,2,   0,0,0,0,0,0,0,2,  0,0,0,4,   0,0,0,0,0,0,0,5,   0,0,0,4];

    let jsonMetaFormat2 = require('./test_without_import.json');

    it('empty input lead to empty output', () => {
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).compactPropertyToLiteral([])).toEqual('')
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).literalToCompactProperty('')).toEqual([]);
    });

    it('should transform successfully when importing other proto def', () => {
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).compactPropertyToLiteral(compactPropertyWithImport)).toEqual(literalWithImport)
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).literalToCompactProperty(literalWithImport)).toEqual(compactPropertyWithImport);
    });

    it('should transform successfully if prefix exist', () => {
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName,literalPrefix,compactPrefix)).compactPropertyToLiteral(compactPropertyWithPrefix)).toEqual(literal)
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName,literalPrefix,compactPrefix)).literalToCompactProperty(literalWithPrefix)).toEqual(compactProperty);
    });

    it('should throw if contains incorrect prefix', () => {
        expect(() => {
            (new PropertyTransformHelper(jsonMetaFormat, packageName, msgName,literalPrefix,compactPrefix)).compactPropertyToLiteral(compactPropertyWithErrorPrefix);
        }).toThrow();
        expect(() => {
            (new PropertyTransformHelper(jsonMetaFormat, packageName, msgName,literalPrefix,compactPrefix)).literalToCompactProperty(literalWithErrorPrefix);
        }).toThrow();
    })

    it('string map should work', () => {
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).compactPropertyToLiteral(compactPropertyForStringMap)).toEqual(literalForStringMap);
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).literalToCompactProperty(literalForStringMap)).toEqual(compactPropertyForStringMap);
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).compactPropertyToLiteral(compactPropertyForStringMap2)).toEqual(literalForStringMap2);
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).literalToCompactProperty(literalForStringMap2)).toEqual(compactPropertyForStringMap2);
    });

    it('too long key string map should throw', () => {
        expect(() => {
           (new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).literalToCompactProperty(longKeyLiteralForStringMap);
        }).toThrow();
    });

    it('uint64 map should work', () => {
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).compactPropertyToLiteral(compactPropertyForUint64Map)).toEqual(literalForUint64Map);
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).literalToCompactProperty(literalForUint64Map)).toEqual(compactPropertyForUint64Map);
    });

    it('int64 map should work', () => {
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).compactPropertyToLiteral(compactPropertyForInt64Map)).toEqual(literalForInt64Map);
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).literalToCompactProperty(literalForInt64Map)).toEqual(compactPropertyForInt64Map);
    });

    it('should transform successfully without importing', () => {
       expect((new PropertyTransformHelper(jsonMetaFormat2, packageName, msgName)).compactPropertyToLiteral(compactProperty)).toEqual(literal)
       expect((new PropertyTransformHelper(jsonMetaFormat2, packageName, msgName)).literalToCompactProperty(literal)).toEqual(compactProperty);
    });

    it('mismatched json and package name should throw', () => {
        expect(() => {
            (new PropertyTransformHelper(jsonMetaFormat, 'non-existed', msgName)).compactPropertyToLiteral(errorCompactProperty1);
        }).toThrow();
    });

    it('non-existed message type should throw', () => {
        expect(() => {
            (new PropertyTransformHelper(jsonMetaFormat, packageName, 'non-existed')).compactPropertyToLiteral(errorCompactProperty1);
        }).toThrow();
    });

    it('non-existed field id case 1 should throw', () => {
        expect(() => {
            (new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).compactPropertyToLiteral(errorCompactProperty1);
        }).toThrow();
    });

    it('non-existed field id case2 should throw', () => {
        expect(() => {
            (new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).compactPropertyToLiteral(errorCompactProperty2);
        }).toThrow();
    });

    it('non-existed field name case 1 should throw', () => {
        expect(() => {
            (new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).literalToCompactProperty(errorLiteral1);
        }).toThrow();
    });

    it('non-existed field name case 2 should throw', () => {
        expect(() => {
            (new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).literalToCompactProperty(errorLiteral2);
        }).toThrow();
    });

    it('repeated format error should throw', () => {
        expect(() => {
            (new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).literalToCompactProperty(errorLiteral3);
        }).toThrow();
    });

    it('format error case 1 should throw', () => {
        expect(() => {
            (new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).literalToCompactProperty(errorLiteral4);
        }).toThrow();
    });

    it('format error case 2 should throw', () => {
        expect(() => {
            (new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).literalToCompactProperty(errorLiteral5);
        }).toThrow();
    });

});
