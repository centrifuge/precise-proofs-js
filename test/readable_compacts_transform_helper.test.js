import {
    TransformHelper
} from "../src/readable_compacts_transform_helper";

describe('Transform Helper', () => {
    let packageName = "test";
    let msgName = "Total";
    let jsonMetaFormat = require('./test_with_import.json');
    let readableName = 'items[513].items[2].cents[5].cents';
    let errorReadableName1='name[513].items[2].cents[5].cents';
    let errorReadableName2='items[513].items[2].cents[5].cen';
    let errorReadableName3='items[51a3].items[2].cents[5].cents';
    let compacts = [2, 513, 2, 2, 4, 5, 2];
    let errorCompacts1 = [4, 513, 2, 2, 4, 5, 2];
    let errorCompacts2 = [2, 513, 2, 2, 4, 5, 3];
    let jsonMetaFormat2 = require('./test_without_import.json');
    
    it('Empty input lead to empty output', () => {
        expect((new TransformHelper(jsonMetaFormat, packageName, msgName)).compactsToReadableString([])).toEqual('')
        expect((new TransformHelper(jsonMetaFormat, packageName, msgName)).readableStringToCompacts('')).toEqual([]);
    });


    it('should transform successfully when importing other proto def', () => {
        expect((new TransformHelper(jsonMetaFormat, packageName, msgName)).compactsToReadableString(compacts)).toEqual(readableName)
        expect((new TransformHelper(jsonMetaFormat, packageName, msgName)).readableStringToCompacts(readableName)).toEqual(compacts);
    });
    
    it('should transform successfully', () => {
        expect((new TransformHelper(jsonMetaFormat2, packageName, msgName)).compactsToReadableString(compacts)).toEqual(readableName)
        expect((new TransformHelper(jsonMetaFormat2, packageName, msgName)).readableStringToCompacts(readableName)).toEqual(compacts);
    });

    it('mismatched json and package name should throw', () => {
        expect(() => {
            (new TransformHelper(jsonMetaFormat, 'non-existed', msgName)).compactsToReadableString(errorCompacts1);
        }).toThrow();
    });

    it('non-existed message type should throw', () => {
        expect(() => {
            (new TransformHelper(jsonMetaFormat, packageName, 'existed')).compactsToReadableString(errorCompacts1);
        }).toThrow();
    });

    it('non exist field id should throw', () => {
        expect(() => {
            (new TransformHelper(jsonMetaFormat, packageName, msgName)).compactsToReadableString(errorCompacts1);
        }).toThrow();
    });

    
    it('non exist field id should throw', () => {
        expect(() => {
            (new TransformHelper(jsonMetaFormat, packageName, msgName)).compactsToReadableString(errorCompacts2);
        }).toThrow();
    });

    it('non exist field name should throw', () => {
        expect(() => {
            (new TransformHelper(jsonMetaFormat, packageName, msgName)).readableStringToCompacts(errorReadableName1);
        }).toThrow();
    });

    it('non exist field name should throw', () => {
        expect(() => {
            (new TransformHelper(jsonMetaFormat, packageName, msgName)).readableStringToCompacts(errorReadableName2);
        }).toThrow();
    });

    it('repeated format error should throw', () => {
        expect(() => {
            (new TransformHelper(jsonMetaFormat, packageName, msgName)).readableStringToCompacts(errorReadableName3);
        }).toThrow();
    });

});