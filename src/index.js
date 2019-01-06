import {sha3_256} from "js-sha3";
import sha2_256 from "js-sha256";

export const SHA2_256 = "SHA2_256";
export const SHA3_256 = "SHA3_256";
export {PropertyTransformHelper} from "./PropertyTransformHelper";

const hashFunction = (value, hashType) => {
    switch (hashType) {
        case SHA2_256: {
            return Buffer.from(sha2_256.array(value));
        }
        case SHA3_256: {
            return Buffer.from(sha3_256.array(value));
        }
        default:
            throw new Error(`Hash ${hashType} type not supported`);
    }
};

const toBuffer = (value, type) => {
    if (type === 'hex' && value.match(/^0x/)) {
        value = value.slice(2);
    }
    return Buffer.from(value, type);
}

const hashTypeSymbol = Symbol("hashType");
const hashFunctionSymbol = Symbol("hashFunction");

export class PreciseProofs {

    constructor(hashType = "hex", hashFunction = SHA2_256) {
        this[hashFunctionSymbol] = hashFunction;
        this[hashTypeSymbol] = hashType;
    }

    // Checks the format of a field proof
    static isValidFieldFormat(proof) {
        return (
            proof &&
            proof.property &&
            proof.value &&
            proof.salt &&
            (proof.hashes || proof.sorted_hashes) &&
            (Array.isArray(proof.hashes) || Array.isArray(proof.sorted_hashes))
        )
    };

    // Validates a field proof returns true or false
    isValidField(proof, rootHash) {

        if (!PreciseProofs.isValidFieldFormat(proof)) throw new Error('Field proof format is invalid, please read the documentation');
        if (proof.hashes && proof.sorted_hashes) throw new Error('Proof can not have hashes and sorted_hashes prop at the same time');

        let root = toBuffer(rootHash, this[hashTypeSymbol]);
        // Create hash from cocatenated property name, value and salt
        let proofHash = hashFunction(Buffer.concat([toBuffer(proof.property, 'ascii'), toBuffer(proof.value, 'ascii'), toBuffer(proof.salt, this[hashTypeSymbol])]), this[hashFunctionSymbol]);
        let resultHash;

        if(proof.hashes) {
            // Handle one property/leaf documents
            if (proof.hashes.length === 0) return root.toString('hex') === proofHash.toString('hex');
            resultHash = proof.hashes.reduce((acc, currentValue) => {
                if (currentValue.left) {
                    return hashFunction(Buffer.concat([toBuffer(currentValue.left, this[hashTypeSymbol]), acc]), this[hashFunctionSymbol]);
                } else if (currentValue.right) {
                    return hashFunction(Buffer.concat([acc, toBuffer(currentValue.right, this[hashTypeSymbol])]), this[hashFunctionSymbol]);
                } else {
                    throw new Error(`Bad format for hash object: ${currentValue}. It should have a left or a right property`)
                }
            }, proofHash);
        } else if(proof.sorted_hashes) {
            // Handle one property/leaf documents
            if (proof.sorted_hashes.length === 0) return root.toString('hex') === proofHash.toString('hex');
            resultHash = proof.sorted_hashes.reduce((acc, currentValue) => {
                if (typeof currentValue === 'string') {
                    return hashFunction(Buffer.concat([acc, toBuffer(currentValue, this[hashTypeSymbol])].sort(Buffer.compare)), this[hashFunctionSymbol]);
                }  else {
                    throw new Error(`Bad format for hash object: ${currentValue}. It should be a string hash`)
                }
            }, proofHash);
        }


        return resultHash.toString('hex') === root.toString('hex');
    };

}
