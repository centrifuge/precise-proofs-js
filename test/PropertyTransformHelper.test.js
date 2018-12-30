import {
    PropertyTransformHelper
} from "../src/PropertyTransformHelper";

import {PreciseProofs, SHA3_256} from "../src/index";

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
    let Long = require('long');
    let comToLong = (com) =>{
        return new Long(com, 0, true)
    }
    let pairsToLong = (low, high) =>{
        return new Long(low, high, true)
    }
    let comsToLongs = (coms) => {
        let result = new Array
        for (let ii in coms){
            result.push(comToLong(coms[ii]))
        }
        return result
    }

describe('Property Transform Helper', () => {

    let ProtoBuf = require('protobufjs');

    //encoded by golang side for ExampleFilledNestedRepeatedDocument with proof for valueD.valueA.valueA = ValueDAA (compactProperty mode off)
    let proofHexStrWithLiteral = "120856616c75654441411a2008745defd50b2b3288672f91e579bb36750a7efb43b19019a145758a15e7078322220a20a9b9c8f4100457328a0cf5fa8eab04fbcb8adc418d1c487f345762707652985d2222122058e0dbc3a34450315e43879233a987d458e6541e89c5fa324ae719ef355bf66f22220a20c044e3c925191831b1edf163f40a5ac1b36d5c2e379ab6b34ab1ad0a5596e3213a1476616c7565442e76616c7565412e76616c756541";

    //encoded by golang side for ExampleFilledNestedRepeatedDocument with proof for valueD.valueA.valueA = ValueDAA (compactProperty mode on)
    let proofHexStrWithCompactProperty ="120856616c75654441411a202f8784d9b2580a7c6835e006c7bb545d8728de228f7b3d5c317991297c8e52ab22220a2073c405f9d1778440c45574cd1975ef546f77b2373f718bf6b2f2204ef45cb53d222212206edd3022b99e902687ba8485fe3d5f9e86717252f3eee955b1116b798fb4c24c22220a20f51fbb85bade17343fd7e1fbfbecadd66154292c5474fcdf21480a2aa6c09c004a050a03040101"

    //encoded by golang side for ExampleFilledNestedRepeatedDocument with proof for valueD.valueA.valueA = ValueDAA (compactProperty mode off, parent prefix is org.precise)
    let proofHexStrWithLiteralAndParentPrefix = "120856616c75654441411a20571fb61b6695c7a4808b341aa1f57cf6503f82d120ad6bd8f16d983f5d7b04f422220a20236739850eb7051fddcfc0fea5fa7dbdeab7511a7a8df223edadf578eebd7b0622221220e308580f3f5eb4155fe551db79a5327673384eb3e9abfd05ff61e55991d791df22220a20e7eb8e592e988615186b903387f61fd8761ad50419fead5ee4640419681b6ba83a206f72672e707265636973652e76616c7565442e76616c7565412e76616c756541";

    let targetCompactProperty = comsToLongs([4,1,1]);
    let proofBuild = ProtoBuf.loadJson(require('./proof.json')).build("proofs.Proof");
    let proofWithLiteral = proofBuild.decodeHex(proofHexStrWithLiteral);
    let proofWithLiteralAndParentPrefix = proofBuild.decodeHex(proofHexStrWithLiteralAndParentPrefix);
    let proofWithCompactProperty = proofBuild.decodeHex(proofHexStrWithCompactProperty);

    let hexProof = {
        "property": new PropertyTransformHelper(require('./examples.json'), "documents", "NestedRepeatedDocument").compactPropertyToLiteral(comsToLongs([4,1,1])),
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

    let rootHash = "22153fca4874c6d83471e5cdbbbd76405ba5b659f3763172b5c396f1b983826b"
    let rootHashWithParentPrefix = "c899906bba1651a6f6cc8e12ed5bcfd0df651b0b1a240ce38d580315ed4a34b5"

    it('proof generated by Golang (with compactProperty off) should be validated by js side', () => {
        expect(hexProof.property).toEqual('valueD.valueA.valueA')
        expect(hexProof.value).toEqual('ValueDAA')
        expect((new PreciseProofs()).isValidField(hexProof, rootHash)).toEqual(true)
    });

    it('compactProperty Components of proof generated by golang (with compactProperty on) should  be decoded sucessfully', () => {
        expect(proofWithCompactProperty.compact_name.components).toEqual(targetCompactProperty);
    });

    it('when proof contain parent prifix should transform literal to compact correctly if parent prefix is provided', () => {
        let tmpLiteral = proofWithLiteralAndParentPrefix.readable_name ;
        expect(new PropertyTransformHelper(require('./examples.json'), "documents", "NestedRepeatedDocument", "org.precise").literalToCompactProperty(tmpLiteral)).toEqual(targetCompactProperty)
        expect((new PreciseProofs()).isValidField(hexProofWithParentPrefix, rootHashWithParentPrefix)).toEqual(true)
    });

    let packageName = "test";
    let msgName = "Total";
    let jsonMetaFormat = require('./test_with_import.json');

    let literal = 'items[513].items[2].cents[5].cents';
    let literalPrefix='org.precise'
    let compactPrefix = comsToLongs([55, 66])
    let literalWithPrefix = literalPrefix + '.' + literal;
    let literalWithErrorPrefix = 'org.precises' + '.' + literal;
    let compactProperty = comsToLongs([2, 513, 2, 2, 4, 5, 2]);
    let compactPropertyWithPrefix = compactPrefix.concat(compactProperty);
    let compactPropertyWithErrorPrefix = comsToLongs([55, 77]).concat(compactProperty);

    let literalForStringMap='itemMap[abc].name';
    let longKeyLiteralForStringMap = 'itemMap[abcasdasdahjdfdhsjhadhahdahdajsdjahjfssdjjjhshfshjsjfhsjahashdakjsdhadjkasdhashdahsdhaksdkhsajkdhajasdhajsdkjakjsdjadsjadjadjjajahadhsjdahjasdhahd].name';
    let compactPropertyForStringMap = comsToLongs([3, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0x616263,1]);

    let literalForBytesMap='itemMap2[0xabbccd].name';
    let compactPropertyForBytesMap = comsToLongs([4, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0xabbccd,1]);

    let literalForUint64Map='itemMap3[567].name';
    let compactPropertyForUint64Map = comsToLongs([5,567,1]);

    let literalForInt64Map='itemMap4[-4567].name';
    let compactPropertyForInt64Map = [comToLong(6), Long.fromString('-4567'),comToLong(1)];

    let literalWithImport = 'items[513].items[2].cents[5].value.name';
    let compactPropertyWithImport = comsToLongs([2, 513, 2, 2, 4, 5, 3, 1]);

    let errorLiteral1 = 'name[513].items[2].cents[5].cents';
    let errorLiteral2 = 'items[513].items[2].cents[5].cen';
    let errorLiteral3 = 'items[51a3].items[2].cents[5].cents';
    let errorLiteral4 = '[51a3].items[2].cents[5].cents';
    let errorLiteral5 = '.items[2].cents[5].cents';

    let errorCompactProperty1 = comsToLongs([8, 513, 2, 2, 4, 5, 2]);
    let errorCompactProperty2 = comsToLongs([2, 513, 2, 2, 4, 5, 4]);

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

    it('should throw if contian error prefix', () => {
        expect(() => {
            (new PropertyTransformHelper(jsonMetaFormat, packageName, msgName,literalPrefix,compactPrefix)).compactPropertyToLiteral(compactPropertyWithErrorPrefix);
        }).toThrow();
        expect(() => {
            (new PropertyTransformHelper(jsonMetaFormat, packageName, msgName,literalPrefix,compactPrefix)).literalToCompactProperty(literalWithErrorPrefix);
        }).toThrow();
    })

    it('string map should work', () => {
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).compactPropertyToLiteral(compactPropertyForStringMap)).toEqual(literalForStringMap)
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).literalToCompactProperty(literalForStringMap)).toEqual(compactPropertyForStringMap);
    });

    it('too long key string map should throw', () => {
        expect(() => {
           (new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).literalToCompactProperty(longKeyLiteralForStringMap);
        }).toThrow();
    });

    it('bytes map should work', () => {
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).compactPropertyToLiteral(compactPropertyForBytesMap)).toEqual(literalForBytesMap);
        expect((new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).literalToCompactProperty(literalForBytesMap)).toEqual(compactPropertyForBytesMap);
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

    it('non exist field id case 1 should throw', () => {
        expect(() => {
            (new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).compactPropertyToLiteral(errorCompactProperty1);
        }).toThrow();
    });

    it('non exist field id case2 should throw', () => {
        expect(() => {
            (new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).compactPropertyToLiteral(errorCompactProperty2);
        }).toThrow();
    });

    it('non exist field name case 1 should throw', () => {
        expect(() => {
            (new PropertyTransformHelper(jsonMetaFormat, packageName, msgName)).literalToCompactProperty(errorLiteral1);
        }).toThrow();
    });

    it('non exist field name case 2 should throw', () => {
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
