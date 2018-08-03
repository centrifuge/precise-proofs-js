import {sha3_256} from "js-sha3";
import sha2_256 from "js-sha256";

export const SHA2_256 = "SHA2_256";
export const SHA3_256 = "SHA3_256";

const hashFunction = (value, hashType) => {
  switch (hashType) {
    case SHA2_256: {
      return Buffer.from(sha2_256.array(value));
    }
    case SHA3_256: {
      return Buffer.from(sha3_256.array(value));
    }
    default:
      throw new Error(`Encryption ${hashType} type not supported`);
  }
};

const hashTypeSymbol = Symbol("hashType");

export class PreciseProofs {

  constructor(hashType = SHA2_256) {
    this[hashTypeSymbol] = hashType;
  }

  // Checks the format of a field proof
  static isValidFieldFormat(proof) {
    return proof && proof.property && proof.value && proof.salt && proof.hashes && Array.isArray(proof.hashes);
  };


  // Validates a field proof returns true or false
  isValidField(proof, rootHash) {

    if (!PreciseProofs.isValidFieldFormat(proof)) throw new Error('Field proof format is invalid, please read the documentation');

    let root = Buffer.from(rootHash, 'base64');

    // Create hash from cocatenated property name, value and salt
    let proofHash = hashFunction(Buffer.concat([Buffer.from(proof.property), Buffer.from(proof.value), Buffer.from(proof.salt, 'base64')]), this[hashTypeSymbol]);

    // Handle one property/leaf documents
    if (proof.hashes.length === 0) return root.toString('hex') === proofHash.toString('hex');

    let resultHash = proof.hashes.reduce((acc, currentValue) => {
      if (currentValue.left) {
        return hashFunction(Buffer.concat([Buffer.from(currentValue.left, 'base64'), acc]), this[hashTypeSymbol]);
      } else if (currentValue.right) {
        return hashFunction(Buffer.concat([acc, Buffer.from(currentValue.right, 'base64')]), this[hashTypeSymbol]);
      } else {
        throw new Error(`Bad format for hash object: ${currentValue}. It should have a left or a right property`)
      }
    }, proofHash);

    return resultHash.toString('hex') === root.toString('hex');
  };

}







