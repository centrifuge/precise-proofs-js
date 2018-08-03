Precise Proofs Js
==============

Read the [introduction on Precise-Proofs](https://github.com/centrifuge/precise-proofs)

Precise Proofs Js is a library for validating fields/leafs from  Merkle proofs created with [precise-proofs](https://github.com/centrifuge/precise-proofs/blob/master/README.md). 
The library support 2   hashing functions:  SHA2_256 and SHA3_256 and it uses SHA2_256 out of the box.

In case you generate your proofs with SHA3_256 you can swich using the following code:

```javascript
import {PreciseProofs, SHA3_256} from "precise-proofs-js";

const preciseProofs = new PreciseProofs(SHA3_256);
```

## Supported Proof format

```js,
{  
    "property":"ValueA",
    "value":"Example",
    "salt":"1VWQFUGCXl1AYS0iAULHQow4XEjgJF/TpAuOO2Rnm+E=",
    "hashes":[  
        { "right":"kYXAGhDdPiFMq1ZQMOZiKmSf1S1eHNgJ6BIPSIExOj8=" },
        { "left":"GDgT7Km6NK6k4N/Id4CZXErL3p6clNX7sVnlNyegdG0=" },
        { "right":"qOZzS+YM8t1OfC87zEKgkKz6q0f3wwk5+ed+PR/2cDA=" }
    ]
}
```



## Usage:


```javascript,
import {PreciseProofs} from "precise-proofs-js";

const rootHash = "Qpvx6jMpfee4eXYeDm+DO+Z8iArdnYdm3J3BH0AUxHU=";
const proof = {
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

const preciseProofs = new PreciseProofs();
    
const valid = preciseProofs.isValidField(proof, rootHash)
// valid  === true 
```

### Missing features
The following features are being worked on:
* support Hex encoded hashes
* construct tree and generate proof
* Support for nested documents