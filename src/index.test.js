import {PreciseProofs, SHA3_256} from "./index";

describe('Precise Proofs', () => {

  let rootHash = "Qpvx6jMpfee4eXYeDm+DO+Z8iArdnYdm3J3BH0AUxHU=";
  let fieldProofs = [
    {
      "property": "value1",
      "value": "1",
      "salt": "Bs89XQyxE05c57R5KVb8aFk7rqf+A5XUgxlH3t1hRoY=",
      "hashes": [
        {
          "left": "bklbhC4cmgYc+w3k5an7PWICQHNZtozeqD16b7GE5ZI="
        },
        {
          "right": "5hFb4MZvIgE9RQnQDlOGGjahlgDIJwX7Id98oxFECbo="
        },
        {
          "right": "CT59ksUtUWOq+HagFoJgJziPOiHkHlvsvytA6TnTLq8="
        }
      ]
    },
    {
      "property": "valueA",
      "value": "Foo",
      "salt": "QlCyk/BJQKATtN+qHpiYPlMeUqpUxKuOmvu1y/ezx5s=",
      "hashes": [
        {
          "left": "qLz4OcrTJGEhBBTKyMCPYbC7uQoOUPK9u9vlEdiL4VY="
        },
        {
          "left": "AWZV3L01oai5JXxnHBRaIBjaOsOkuuT4KFxvMYn/u5I="
        },
        {
          "right": "CT59ksUtUWOq+HagFoJgJziPOiHkHlvsvytA6TnTLq8="
        }
      ]
    },
    {
      "property": "valueB",
      "value": "Bar",
      "salt": "z4g9rCRZ4Y3LuA3yA/SKpf+KBGrDCgA3zJ1/Uv4xR/s=",
      "hashes": [
        {
          "right": "jeRcbMUti3dWbjSO2D9NynDydPOzl2j4QmuLKUJRcfU="
        },
        {
          "left": "UEiDzBoD+xoLLYOAnUeQsGMXge9JMmOnsVIncsnPli0="
        }
      ]
    }
  ];
  

  it('should throw an error if the proof is missing the prop a prop', () => {
    let proof = {...fieldProofs[0]};
    delete proof.property;
    expect(() => {
      (new PreciseProofs()).isValidField(proof, rootHash);
    }).toThrow();
  });

  it('should throw an error if the proof is missing the value prop', () => {
    let proof = {...fieldProofs[0]};
    delete proof.value;
    expect(() => {
      (new PreciseProofs()).isValidField(proof, rootHash);
    }).toThrow();
  });

  it('should throw an error if the proof is missing the salt prop', () => {
    let proof = {...fieldProofs[0]};
    delete proof.salt;
    expect(() => {
      (new PreciseProofs()).isValidField(proof, rootHash);
    }).toThrow();
  });

  it('should throw an error if the proof is missing the hashes prop', () => {
    let proof = {...fieldProofs[0]};
    delete proof.hashes;
    expect(() => {
      (new PreciseProofs()).isValidField(proof, rootHash);
    }).toThrow();
  });

  it('should throw an error if the hashes prop is not an array', () => {
    let proof = {...fieldProofs[0]};
    proof.hashes = {};
    expect(() => {
      (new PreciseProofs()).isValidField(proof, rootHash);
    }).toThrow();
  });

  it('should throw an error if the hashes have bad formated hash object', () => {
    let proof = {...fieldProofs[0]};
    proof.hashes = [
      {}
    ];
    expect(() => {
      (new PreciseProofs()).isValidField(proof, rootHash);
    }).toThrow();
  });

  it('should have a valid proof', () => {
    let proof = {...fieldProofs[0]};
    expect((new PreciseProofs()).isValidField(proof, rootHash)).toEqual(true)
  });

  it("should have an invalid proof", () => {
    let proof = {...fieldProofs[0], hashes: [...fieldProofs[0].hashes]};
    proof.hashes.pop();
    expect((new PreciseProofs()).isValidField(proof, rootHash)).toEqual(false)
  });

  it('should fail in case SHA3 is used on SHA2 proof ', () => {
    let proof = {...fieldProofs[0]};

    expect((new PreciseProofs(SHA3_256)).isValidField(proof, rootHash)).toEqual(false)
  });

});