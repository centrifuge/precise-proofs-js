import {PreciseProofs, SHA3_256} from "../src/index";

describe('Precise Proofs', () => {

    let base64Root = "Qpvx6jMpfee4eXYeDm+DO+Z8iArdnYdm3J3BH0AUxHU=";
    let base64Proof = {
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
    }

    //0x91593d5868e48ee4b14e32d472f49aeae2e2b927bc5fecaf18a72c7a8eeccb69 0x29dbffa68e5cd48bb4cb2504190f10883fb187793b2f70eab81fb5440c6809b6


    let hexRoot = "29dbffa68e5cd48bb4cb2504190f10883fb187793b2f70eab81fb5440c6809b6";
    let hexRoot0x = "0x29dbffa68e5cd48bb4cb2504190f10883fb187793b2f70eab81fb5440c6809b6";

    let hexProof = {
        "property": "valueA",
        "value": "Example",
        "salt": "d555901541825e5d40612d220142c7428c385c48e0245fd3a40b8e3b64679be1",
        "hashes": [
            {
                "right": "60c3dfcdd85fcef1d4826d4695fb5064aa8434d014f2c1547f9398bdf72bdb75"
            },
            {
                "left": "8951fa82c3f5563d88769a9ecb8f6e03b389c06ff64a1b26dc5898cefe95a42f"
            },
            {
                "right": "46d0a998333fc2c8b4cfff1d5e122f7c32ff46f0a4410f63821f45cc02fd3723"
            }
        ]
    }

    let hexProof0x = {
        "property": "valueA",
        "value": "Example",
        "salt": "0xd555901541825e5d40612d220142c7428c385c48e0245fd3a40b8e3b64679be1",
        "hashes": [
            {
                "right": "0x60c3dfcdd85fcef1d4826d4695fb5064aa8434d014f2c1547f9398bdf72bdb75"
            },
            {
                "left": "0x8951fa82c3f5563d88769a9ecb8f6e03b389c06ff64a1b26dc5898cefe95a42f"
            },
            {
                "right": "0x46d0a998333fc2c8b4cfff1d5e122f7c32ff46f0a4410f63821f45cc02fd3723"
            }
        ]
    }


    let hexProofSorted = {
        "property": "valueA",
        "value": "Example",
        "salt": "d555901541825e5d40612d220142c7428c385c48e0245fd3a40b8e3b64679be1",
        "sorted_hashes": [
            "60c3dfcdd85fcef1d4826d4695fb5064aa8434d014f2c1547f9398bdf72bdb75",
            "8951fa82c3f5563d88769a9ecb8f6e03b389c06ff64a1b26dc5898cefe95a42f",
            "46d0a998333fc2c8b4cfff1d5e122f7c32ff46f0a4410f63821f45cc02fd3723"

        ]
    }


    it('should throw an error if the proof is missing the prop a prop', () => {
        let proof = {...hexProof};
        delete proof.property;
        expect(() => {
            (new PreciseProofs()).isValidField(proof, hexRoot);
        }).toThrow();
    });

    it('should throw an error if the proof is missing the value prop', () => {
        let proof = {...hexProof};
        delete proof.value;
        expect(() => {
            (new PreciseProofs()).isValidField(proof, hexRoot);
        }).toThrow();
    });

    it('should throw an error if the proof is missing the salt prop', () => {
        let proof = {...hexProof};
        delete proof.salt;
        expect(() => {
            (new PreciseProofs()).isValidField(proof, hexRoot);
        }).toThrow();
    });

    it('should throw an error if the proof does not have hashes or sorted_hashes prop', () => {
        let proof = {...hexProof};
        delete proof.hashes;
        expect(() => {
            (new PreciseProofs()).isValidField(proof, hexRoot);
        }).toThrow();
    });

    it('should throw an error if the hashes prop is not an array', () => {
        let proof = {...hexProof};
        proof.hashes = {};
        expect(() => {
            (new PreciseProofs()).isValidField(proof, hexRoot);
        }).toThrow();
    });

    it('should throw an error if the hashes have bad formated hash objects', () => {
        let proof = {...hexProof};
        proof.hashes = [
            {}
        ];
        expect(() => {
            (new PreciseProofs()).isValidField(proof, hexRoot);
        }).toThrow();
    });


    it('should throw an error if the sorted_hashes have bad formated hash strings', () => {
        let proof = {...hexProof};
        proof.sorted_hashes = [
            {}
        ];
        expect(() => {
            (new PreciseProofs()).isValidField(proof, hexRoot);
        }).toThrow();
    });


    it('should throw an error if is has hashes and sorted_hashes at the same time', () => {
        let proof = {...hexProof};
        proof.hashes = [
            {}
        ];
        proof.sorted_hashes = [];

        expect(() => {
            (new PreciseProofs()).isValidField(proof, hexRoot);
        }).toThrow();
    });

    it('should have a valid proof', () => {
        expect((new PreciseProofs()).isValidField(hexProof, hexRoot)).toEqual(true)
        expect((new PreciseProofs()).isValidField(hexProof0x, hexRoot0x)).toEqual(true)
        expect((new PreciseProofs()).isValidField(hexProof, hexRoot0x)).toEqual(true)
        expect((new PreciseProofs()).isValidField(hexProof0x, hexRoot)).toEqual(true)
        expect((new PreciseProofs('base64')).isValidField(base64Proof, base64Root)).toEqual(true)
    });


    it('should have a valid proof for sorted hashes', () => {
        expect((new PreciseProofs()).isValidField(hexProofSorted, hexRoot)).toEqual(true)
    });


    it("should have an invalid proof", () => {
        let proof = {...hexProof, hashes: [...hexProof.hashes]};
        proof.hashes.pop();
        expect((new PreciseProofs()).isValidField(proof, hexRoot)).toEqual(false)
    });

    it('should fail in case SHA3 is used on SHA2 proof ', () => {
        expect((new PreciseProofs("hex", SHA3_256)).isValidField(hexProof, hexRoot)).toEqual(false)
    });

});
